"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious 
} from "@/components/ui/pagination";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatDuration } from "@/lib/utils";
import { CalendarIcon, Clock, Calendar as CalendarIcon2, Filter, XCircle, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { useSessions, useProjects } from "@/lib/hooks";
import { GetSessionResponse, GetSessionsRequestQuery } from "@/lib/dtos/session_dto";
import { GetProjectResponseDetail } from "@/lib/dtos/project_dto";

export default function SessionsPage() {
  const { getSessions, loading: sessionsLoading } = useSessions();
  const { getProject, loading: projectLoading } = useProjects();
  
  const [sessions, setSessions] = useState<GetSessionResponse[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [filters, setFilters] = useState<GetSessionsRequestQuery>({
    limit: 10,
    offset: 0,
  });
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);  
  const [currentProject, setCurrentProject] = useState<GetProjectResponseDetail | null>(null);
  
  // Use refs to track loading states and prevent duplicate requests
  const isLoadingProject = useRef(false);
  const isLoadingSessions = useRef(false);
  const initialized = useRef(false);

  // Effect for handling project selection from localStorage and event listeners
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    
    const savedProject = localStorage.getItem('selected-project-id');
    if (savedProject && savedProject !== 'all') {
      setSelectedProjectId(savedProject);
      setFilters(prev => ({ ...prev, project_id: savedProject }));
      
      // Load project details
      loadProject(savedProject);
    }
    
    const handleProjectChange = (e: CustomEvent<string>) => {
      const projectId = e.detail;
      setSelectedProjectId(projectId);
      
      if (projectId && projectId !== 'all') {
        setFilters(prev => ({ ...prev, project_id: projectId }));
        
        // Load project details for the newly selected project
        loadProject(projectId);
      } else {
        setFilters(prev => {
          const newFilters = { ...prev };
          delete newFilters.project_id;
          return newFilters;
        });
        setCurrentProject(null);
      }
    };

    window.addEventListener('projectChanged', handleProjectChange as EventListener);
    
    return () => {
      window.removeEventListener('projectChanged', handleProjectChange as EventListener);
    };
  }, []);

  useEffect(() => {
    loadSessions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, currentPage]);

  async function loadProject(projectId: string) {
    if (isLoadingProject.current) return;
    
    // Skip invalid project ids
    if (!projectId || projectId === 'all') {
      setCurrentProject(null);
      return;
    }
    
    // Set loading flag
    isLoadingProject.current = true;
    
    try {
      const project = await getProject(projectId);
      setCurrentProject(project);
    } catch (error) {
      console.error('Error fetching project details:', error);
      setCurrentProject(null);
    } finally {
      // Clear loading flag
      isLoadingProject.current = false;
    }
  }
  
  async function loadSessions() {
    if (isLoadingSessions.current) return;
    
    isLoadingSessions.current = true;
    
    try {
      const result = await getSessions({
        ...filters,
        offset: (currentPage - 1) * (filters.limit || 10),
      });
      setSessions(result.sessions);
      setTotalSessions(result.total);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    } finally {
      isLoadingSessions.current = false;
    }
  }

  useEffect(() => {
    const savedProject = localStorage.getItem('selected-project-id');
    if (savedProject && savedProject !== selectedProjectId) {
      setSelectedProjectId(savedProject);
      
      if (savedProject !== 'all') {
        setFilters(prev => ({ ...prev, project_id: savedProject }));
        loadProject(savedProject);
      } else {
        setFilters(prev => {
          const newFilters = { ...prev };
          delete newFilters.project_id;
          return newFilters;
        });
        setCurrentProject(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (key: keyof GetSessionsRequestQuery, value: string | number | null) => {
    if (value === null) {
      setFilters(prev => {
        const newFilters = { ...prev };
        delete newFilters[key];
        return newFilters;
      });
    } else {
      setFilters(prev => ({ ...prev, [key]: value }));
    }
    setCurrentPage(1);
  };

  const handleDateFilterApply = () => {
    if (fromDate) {
      handleFilterChange("from_date", fromDate.toISOString());
    }
    
    if (toDate) {
      handleFilterChange("to_date", toDate.toISOString());
    }
  };

  const handleClearFilters = () => {
    setFilters({
      limit: 10,
      offset: 0,
    });
    setFromDate(undefined);
    setToDate(undefined);
    setCurrentPage(1);
    
    const savedProject = localStorage.getItem('selected-project-id');
    if (savedProject && savedProject !== 'all') {
      setSelectedProjectId(savedProject);
      setFilters(prev => ({ ...prev, project_id: savedProject }));
    } else {
      setSelectedProjectId(null);
    }
  };

  const totalPages = Math.ceil(totalSessions / (filters.limit || 10));

  const isLoading = sessionsLoading || projectLoading;

  const FilterSheet = () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden flex gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Filter Sessions</SheetTitle>
          <SheetDescription>
            Apply filters to narrow down your session results
          </SheetDescription>
        </SheetHeader>
        <div className="py-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Date Range</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">From Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fromDate ? format(fromDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={fromDate}
                      onSelect={setFromDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">To Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {toDate ? format(toDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={toDate}
                      onSelect={setToDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <div className="flex justify-between space-x-2">
            <Button variant="outline" onClick={handleClearFilters} className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Clear
            </Button>
            <Button onClick={handleDateFilterApply} className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Apply Filters
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <>
    <div className="space-y-6 w-full max-w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {selectedProjectId === 'all' ? 'Sessions' : currentProject?.name ? `${currentProject.name} - Sessions` : 'Sessions'}
          </h1>
          <p className="text-muted-foreground mt-1">View and manage your time tracking sessions</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <FilterSheet />
          <Button variant="outline" size="sm" onClick={loadSessions} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden md:inline">Refresh</span>
          </Button>
        </div>
      </div>

      <Card className="hidden lg:block w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Narrow down sessions by applying date filters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
            <div>
              <label className="text-sm font-medium mb-1 block">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={setFromDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={setToDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={handleClearFilters} className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Clear
            </Button>
            <Button onClick={handleDateFilterApply} className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader className="md:flex-row md:items-center md:justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Sessions List
            </CardTitle>
            <CardDescription className="mt-1.5">
              {totalSessions} total sessions found
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2 mt-4 md:mt-0">
            <label className="text-sm whitespace-nowrap">Show:</label>
            <Select value={String(filters.limit || 10)} onValueChange={(value) => handleFilterChange("limit", parseInt(value))}>
              <SelectTrigger className="w-[80px]">
                <SelectValue placeholder="10" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3 w-full">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 w-full">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-background/50 w-full">
              <CalendarIcon2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No sessions found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Try adjusting your filters or create a new session.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden w-full">
                <ScrollArea className="max-h-[500px] md:max-h-none w-full">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0">
                      <TableRow>
                        <TableHead className="w-[140px]">Session ID</TableHead>
                        <TableHead className="hidden sm:table-cell">Begin Time</TableHead>
                        <TableHead>End Time</TableHead>
                        <TableHead className="text-right">Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((session) => (
                        <TableRow key={session.session_id} className="hover:bg-muted/50">
                          <TableCell className="font-mono text-xs sm:text-sm">
                            {session.session_id.substring(0, 8)}...
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {format(new Date(session.begin_at), "PPp")}
                          </TableCell>
                          <TableCell>
                            {session.end_at 
                              ? format(new Date(session.end_at), "PPp") 
                              : <span className="text-green-600 dark:text-green-400 inline-flex items-center gap-1">
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                  </span>
                                  Active
                                </span>
                            }
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {session.duration 
                              ? formatDuration(session.duration) 
                              : "—"
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              <div className="mt-4 flex items-center justify-center w-full">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                        className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
                      />
                    </PaginationItem>
                    
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pageToShow;
                      if (totalPages <= 5) {
                        pageToShow = i + 1;
                      } else if (currentPage <= 3) {
                        pageToShow = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageToShow = totalPages - 4 + i;
                      } else {
                        pageToShow = currentPage - 2 + i;
                      }
                      
                      if (pageToShow <= totalPages) {
                        return (
                          <PaginationItem key={pageToShow} className="hidden sm:inline-block">
                            <PaginationLink
                              isActive={currentPage === pageToShow}
                              onClick={() => handlePageChange(pageToShow)}
                            >
                              {pageToShow}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }
                      return null;
                    })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                        className={cn(currentPage === totalPages && "pointer-events-none opacity-50")}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
              <div className="text-center text-sm text-muted-foreground mt-2 w-full">
                Page {currentPage} of {totalPages}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
} 
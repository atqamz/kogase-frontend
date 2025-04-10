"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CalendarIcon, Loader2 } from "lucide-react";

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

  const fetchSessions = useCallback(async () => {
    try {
      const result = await getSessions({
        ...filters,
        offset: (currentPage - 1) * (filters.limit || 10),
      });
      setSessions(result.sessions);
      setTotalSessions(result.total);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    }
  }, [filters, currentPage, getSessions]);

  const fetchCurrentProject = useCallback(async (projectId: string) => {
    try {
      if (projectId && projectId !== 'all') {
        const project = await getProject(projectId);
        setCurrentProject(project);
      } else {
        setCurrentProject(null);
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
      setCurrentProject(null);
    }
  }, [getProject]);

  useEffect(() => {
    const savedProject = localStorage.getItem('selected-project-id');
    if (savedProject && savedProject !== 'all') {
      setSelectedProjectId(savedProject);
      setFilters(prev => ({ ...prev, project_id: savedProject }));
      fetchCurrentProject(savedProject);
    }
    
    const handleProjectChange = (e: CustomEvent<string>) => {
      setSelectedProjectId(e.detail);
      if (e.detail && e.detail !== 'all') {
        setFilters(prev => ({ ...prev, project_id: e.detail }));
        fetchCurrentProject(e.detail);
      } else {
        const newFilters = { ...filters };
        delete newFilters.project_id;
        setFilters(newFilters);
        setCurrentProject(null);
      }
    };

    window.addEventListener('projectChanged', handleProjectChange as EventListener);
    
    return () => {
      window.removeEventListener('projectChanged', handleProjectChange as EventListener);
    };
  }, [fetchCurrentProject, filters]);

  // Re-fetch data when the pathname or query parameters change
  useEffect(() => {
    const savedProject = localStorage.getItem('selected-project-id');
    if (savedProject && savedProject !== selectedProjectId) {
      setSelectedProjectId(savedProject);
      if (savedProject !== 'all') {
        setFilters(prev => ({ ...prev, project_id: savedProject }));
        fetchCurrentProject(savedProject);
      } else {
        const newFilters = { ...filters };
        delete newFilters.project_id;
        setFilters(newFilters);
        setCurrentProject(null);
      }
    }
  }, [filters, selectedProjectId, fetchCurrentProject]);

  // Fetch sessions when filters or page changes
  useEffect(() => {
    fetchSessions();
  }, [filters, currentPage, fetchSessions]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (key: keyof GetSessionsRequestQuery, value: string | number | null) => {
    // If value is null, remove the filter
    if (value === null) {
      const newFilters = { ...filters };
      delete newFilters[key];
      setFilters(newFilters);
    } else {
      setFilters((prev) => ({ ...prev, [key]: value }));
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {selectedProjectId === 'all' ? 'Sessions' : currentProject?.name ? `${currentProject.name} - Sessions` : 'Sessions'}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <Button variant="outline" onClick={handleClearFilters}>
              Clear
            </Button>
            <Button onClick={handleDateFilterApply}>
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Sessions List</CardTitle>
            <div className="flex items-center space-x-2">
              <label className="text-sm">Show:</label>
              <Select
                value={String(filters.limit || 10)}
                onValueChange={(value) => handleFilterChange("limit", parseInt(value))}
              >
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
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sessions found. Try adjusting your filters.
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session ID</TableHead>
                      <TableHead>Begin Time</TableHead>
                      <TableHead>End Time</TableHead>
                      <TableHead>Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.session_id}>
                        <TableCell className="font-mono">
                          {session.session_id}
                        </TableCell>
                        <TableCell>
                          {format(new Date(session.begin_at), "PPp")}
                        </TableCell>
                        <TableCell>
                          {session.end_at 
                            ? format(new Date(session.end_at), "PPp") 
                            : "Session in progress"}
                        </TableCell>
                        <TableCell>
                          {session.duration ? formatDuration(session.duration) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4">
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
                          <PaginationItem key={pageToShow}>
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 
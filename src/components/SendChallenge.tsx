import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ArrowLeft, X, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Student {
  id: string;
  name: string;
  username: string;
  school: string;
  grade: string;
}

interface SendChallengeProps {
  onBack: () => void;
  onNext: (opponent: Student) => void;
  config: any;
}

export function SendChallenge({ onBack, onNext, config }: SendChallengeProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedSchool, setSelectedSchool] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [userGrade, setUserGrade] = useState<string>('');
  const [schools, setSchools] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const PAGE_SIZE = 15;

  useEffect(() => {
    fetchUserData();
  }, [user]);

  useEffect(() => {
    filterStudents();
  }, [selectedSchool, searchQuery, students]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      const { data: studentData } = await supabase
        .from('students')
        .select('id, class_year')
        .eq('user_id', user.id)
        .single();

      if (studentData?.class_year) {
        setUserGrade(studentData.class_year);
        await fetchOpponents(studentData.class_year);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Opponent discovery runs through a scoped SECURITY DEFINER RPC: same grade
  // as the caller, names + school names resolved server-side. The old
  // client-side join never returned results (profiles.id vs students.id
  // mismatch) and depended on platform-wide table reads.
  const fetchOpponents = async (grade: "year_6" | "year_9") => {
    try {
      const { data: rows, error } = await supabase.rpc("search_duel_opponents", {
        p_query: null,
        p_limit: 200,
      });
      if (error) throw error;

      const list: Student[] = (rows || []).map((row) => ({
        id: row.id,
        name: row.full_name || row.username || 'Unknown',
        username: row.username || '',
        school: row.school_name || 'Unknown',
        grade: row.class_year || grade,
      }));
      setStudents(list);

      const schoolNames = [...new Set(list.map((s) => s.school))];
      setSchools(schoolNames);
      if (schoolNames.length > 0) {
        setSelectedSchool(schoolNames[0]);
      }
    } catch (error) {
      console.error('Error fetching opponents:', error);
    }
  };

  const filterStudents = () => {
    let filtered = students.filter(s => s.school === selectedSchool);
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(query) || 
        s.username.toLowerCase().includes(query)
      );
    }
    
    setFilteredStudents(filtered);
    setCurrentPage(1);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + PAGE_SIZE);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="w-full max-w-lg border-primary/20 shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="text-2xl font-bold">Send Challenge</CardTitle>
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            You can only challenge students in your grade ({userGrade === 'year_6' ? 'Year 6' : 'Year 9'})
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="school">School</Label>
            <Select value={selectedSchool} onValueChange={setSelectedSchool}>
              <SelectTrigger id="school">
                <SelectValue placeholder="Select school" />
              </SelectTrigger>
              <SelectContent>
                {schools.map((school) => (
                  <SelectItem key={school} value={school}>
                    {school}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Students in {userGrade === 'year_6' ? 'Year 6' : 'Year 9'}</Label>
            <div className="border rounded-lg overflow-hidden">
              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <div className="max-h-80 overflow-y-auto">
                {paginatedStudents.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No students found
                  </div>
                ) : (
                  paginatedStudents.map((student) => (
                    <div
                      key={student.id}
                      className={`flex items-center gap-3 p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedStudent?.id === student.id ? 'bg-primary/10' : ''
                      }`}
                      onClick={() => setSelectedStudent(student)}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-xs font-bold">
                        {getInitials(student.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{student.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{student.username}</p>
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center">
                        {selectedStudent?.id === student.id && (
                          <Check className="h-3 w-3 text-primary" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between p-3 border-t bg-muted/20">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Prev
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </div>

          {selectedStudent && (
            <div className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-sm font-bold">
                {getInitials(selectedStudent.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-primary">{selectedStudent.name}</p>
                <p className="text-xs text-muted-foreground">{selectedStudent.username} · {selectedStudent.school}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedStudent(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onBack}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              onClick={() => selectedStudent && onNext(selectedStudent)}
              disabled={!selectedStudent}
              className="flex-2 flex-[2]"
            >
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

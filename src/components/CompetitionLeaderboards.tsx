import { Trophy, Calendar, Crown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Student {
  rank: number;
  name: string;
  school: string;
  points: number;
  avatar: string;
}

interface CompetitionLeaderboardsProps {
  showCurrentUserPosition?: boolean;
  currentUserName?: string;
  currentUserRanks?: {
    monthly: number;
    annual: number;
  };
}

export const CompetitionLeaderboards = ({
  showCurrentUserPosition = false,
  currentUserName = "Alex",
  currentUserRanks = { monthly: 12, annual: 8 },
}: CompetitionLeaderboardsProps) => {
  const monthlyLeaders: Student[] = [
    { rank: 1, name: "Chidinma Okafor", school: "Corona Secondary School, Lagos", points: 9850, avatar: "🎓" },
    { rank: 2, name: "Ibrahim Musa", school: "Government College, Abuja", points: 9620, avatar: "📚" },
    { rank: 3, name: "Blessing Adeyemi", school: "International School, Ibadan", points: 9340, avatar: "🌟" },
    { rank: 4, name: "Emeka Nwankwo", school: "Enugu State Academy", points: 9180, avatar: "💫" },
    { rank: 5, name: "Fatima Bello", school: "Capital Science Academy, Kano", points: 8950, avatar: "🎯" },
  ];

  const annualLeaders: Student[] = [
    { rank: 1, name: "Oluwaseun Ajayi", school: "Lagos Preparatory School", points: 98540, avatar: "👑" },
    { rank: 2, name: "Amina Yusuf", school: "Government Secondary, Kaduna", points: 96780, avatar: "🥇" },
    { rank: 3, name: "Chukwuemeka Eze", school: "Port Harcourt International", points: 94920, avatar: "🥈" },
    { rank: 4, name: "Aisha Mohammed", school: "Federal Capital College, Abuja", points: 92650, avatar: "🥉" },
    { rank: 5, name: "Tunde Williams", school: "Gateway Academy, Ibadan", points: 90340, avatar: "⭐" },
  ];

  const renderLeaderboard = (leaders: Student[], icon: React.ReactNode, prizeInfo: string) => (
    <div className="space-y-4">
      <div className="text-center p-4 bg-accent-light rounded-lg">
        <div className="flex items-center justify-center gap-2 mb-2">
          {icon}
          <span className="font-bold text-accent">{prizeInfo}</span>
        </div>
      </div>

      {showCurrentUserPosition && (
        <Card className="border-2 border-primary bg-primary-light/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-xl">
                  👤
                </div>
                <div>
                  <p className="font-semibold text-foreground">{currentUserName} (You)</p>
                  <p className="text-sm text-muted-foreground">Your current position</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">
                  #{leaders === monthlyLeaders ? currentUserRanks.monthly : currentUserRanks.annual}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {leaders.map((student, index) => (
          <Card
            key={index}
            className={`border-2 ${student.rank <= 3 ? "border-accent" : ""} hover:shadow-hover transition-all`}
          >
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start sm:items-center gap-3">
                {/* Avatar with rank badge */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-light rounded-full flex items-center justify-center">
                    <span className="text-xl sm:text-2xl">{student.avatar}</span>
                  </div>
                  <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${student.rank <= 3 ? "bg-accent text-white" : "bg-primary text-white"
                    }`}>
                    <span className="text-[10px] font-bold">#{student.rank}</span>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm sm:text-base font-semibold text-foreground truncate">
                    {student.name}
                  </h4>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                    {student.school}
                  </p>
                </div>

                {/* Points */}
                <div className="text-right flex-shrink-0">
                  <div className="text-base sm:text-lg font-bold text-primary">
                    {student.points.toLocaleString()}
                  </div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">pts</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="text-accent" size={24} />
          National Leaderboards
        </CardTitle>
        <CardDescription>
          Compete with students across Nigeria and win real prizes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="monthly" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="monthly">
              <Calendar size={16} className="mr-1" />
              Monthly
            </TabsTrigger>
            <TabsTrigger value="annual">
              <Crown size={16} className="mr-1" />
              Annual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="monthly" className="mt-6">
            {renderLeaderboard(
              monthlyLeaders,
              <Trophy className="text-accent" size={20} />,
              "Win ₦50,000 Cash Prize!"
            )}
          </TabsContent>

          <TabsContent value="annual" className="mt-6">
            {renderLeaderboard(
              annualLeaders,
              <Crown className="text-accent" size={20} />,
              "Grand Prize: ₦1,500,000 Cash!"
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

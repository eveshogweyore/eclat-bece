import { Trophy, Zap, Calendar, Crown } from "lucide-react";
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
    weekly: number;
    monthly: number;
    annual: number;
  };
}

export const CompetitionLeaderboards = ({
  showCurrentUserPosition = false,
  currentUserName = "Ada",
  currentUserRanks = { weekly: 45, monthly: 12, annual: 8 },
}: CompetitionLeaderboardsProps) => {
  const weeklyLeaders: Student[] = [
    { rank: 1, name: "Ibrahim Yusuf", school: "Federal Government College", points: 1450, avatar: "🏆" },
    { rank: 2, name: "Amaka Obi", school: "Kings College", points: 1380, avatar: "⭐" },
    { rank: 3, name: "Segun Adeyemi", school: "Queen's College", points: 1290, avatar: "✨" },
    { rank: 4, name: "Blessing Okonkwo", school: "Government Secondary School", points: 1210, avatar: "💫" },
    { rank: 5, name: "Taiwo Adeleke", school: "Federal Government College", points: 1150, avatar: "🌟" },
  ];

  const monthlyLeaders: Student[] = [
    { rank: 1, name: "Chidinma Okafor", school: "Queen's College", points: 12450, avatar: "🎓" },
    { rank: 2, name: "Emmanuel Adebayo", school: "Kings College", points: 11890, avatar: "📚" },
    { rank: 3, name: "Fatima Hassan", school: "Federal Government College", points: 11250, avatar: "🌟" },
    { rank: 4, name: "Aisha Mohammed", school: "Government Secondary School", points: 10980, avatar: "💫" },
    { rank: 5, name: "Chukwudi Eze", school: "Queen's College", points: 10750, avatar: "🎯" },
  ];

  const annualLeaders: Student[] = [
    { rank: 1, name: "Fatima Hassan", school: "Federal Government College", points: 145890, avatar: "👑" },
    { rank: 2, name: "Emmanuel Adebayo", school: "Kings College", points: 142340, avatar: "🥇" },
    { rank: 3, name: "Chidinma Okafor", school: "Queen's College", points: 138920, avatar: "🥈" },
    { rank: 4, name: "Ngozi Nwosu", school: "Government Secondary School", points: 135100, avatar: "🥉" },
    { rank: 5, name: "Olumide Johnson", school: "Federal Government College", points: 132890, avatar: "⭐" },
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
                  #{leaders === weeklyLeaders ? currentUserRanks.weekly : 
                    leaders === monthlyLeaders ? currentUserRanks.monthly : 
                    currentUserRanks.annual}
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
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary-light rounded-full flex items-center justify-center">
                  <span className="text-2xl">{student.avatar}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl font-bold text-primary">#{student.rank}</span>
                    <h4 className="text-lg font-semibold text-foreground truncate">{student.name}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{student.school}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xl font-bold text-primary">{student.points.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">points</div>
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
          Competition Leaderboards
        </CardTitle>
        <CardDescription>
          Compete with students across Nigeria and win amazing prizes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="weekly" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="weekly">
              <Zap size={16} className="mr-1" />
              Weekly
            </TabsTrigger>
            <TabsTrigger value="monthly">
              <Calendar size={16} className="mr-1" />
              Monthly
            </TabsTrigger>
            <TabsTrigger value="annual">
              <Crown size={16} className="mr-1" />
              Annual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="mt-6">
            {renderLeaderboard(
              weeklyLeaders,
              <Zap className="text-accent" size={20} />,
              "Win Airtime Every Week!"
            )}
          </TabsContent>

          <TabsContent value="monthly" className="mt-6">
            {renderLeaderboard(
              monthlyLeaders,
              <Trophy className="text-accent" size={20} />,
              "Share in ₦50,000 Prize Pool!"
            )}
          </TabsContent>

          <TabsContent value="annual" className="mt-6">
            {renderLeaderboard(
              annualLeaders,
              <Crown className="text-accent" size={20} />,
              "Grand Prize Pool: ₦2,000,000!"
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

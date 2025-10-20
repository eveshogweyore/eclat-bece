import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { Leaderboard } from "@/components/Leaderboard";
import { About } from "@/components/About";
import { Pricing } from "@/components/Pricing";
import { Footer } from "@/components/Footer";
import { RoleSelectionDialog } from "@/components/RoleSelectionDialog";

const Index = () => {
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  const navigate = useNavigate();
  
  const handleAuthAction = () => {
    navigate("/auth");
  };

  const scrollToLeaderboard = () => {
    const element = document.getElementById("leaderboard");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation onLoginClick={handleAuthAction} onGetStartedClick={handleAuthAction} />
      <Hero onGetStartedClick={handleAuthAction} onViewLeaderboardClick={scrollToLeaderboard} />
      <Features />
      <Leaderboard onViewFullLeaderboard={scrollToLeaderboard} />
      <About />
      <Pricing onGetStartedClick={handleAuthAction} />
      <Footer />
    </div>
  );
};

export default Index;

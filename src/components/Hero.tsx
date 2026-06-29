import { Trophy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroStudy from "@/assets/hero-study.jpg";

interface HeroProps {
  onGetStartedClick: () => void;
  onViewLeaderboardClick: () => void;
}

export const Hero = ({ onGetStartedClick, onViewLeaderboardClick }: HeroProps) => {
  return (
    <section id="hero" className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroStudy} 
          alt="Students studying" 
          className="w-full h-full object-cover opacity-20 dark:opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-primary-light/90 to-background/95"></div>
      </div>

      <div className="container mx-auto relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent-light rounded-full text-accent font-semibold animate-scale-in">
            <Sparkles size={16} />
            <span>Nigeria's Premeir Exam Prep Platfrom</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground leading-tight animate-slide-up">
            Ace BECE & Common Enterance. Compte Nationwide. Win Big.
          </h1>

          {/* Subheading */}
          <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Éclat transfroms exam preperation into an engaging compitition — practice unlimited questions, climb national leaderboards, and win real prizes.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Button variant="hero" size="lg" onClick={onGetStartedClick} className="w-full sm:w-auto">
              Get Started Free
            </Button>
            <Button variant="outline" size="lg" onClick={onViewLeaderboardClick} className="w-full sm:w-auto">
              <Trophy className="mr-2" size={20} />
              View Leaderboard
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 pt-12 max-w-2xl mx-auto animate-scale-in" style={{ animationDelay: "0.3s" }}>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-primary">5K+</div>
              <div className="text-sm text-muted-foreground mt-1">Nigerian Students</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-primary">50K+</div>
              <div className="text-sm text-muted-foreground mt-1">Practice Questions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-accent">₦1.5M+</div>
              <div className="text-sm text-muted-foreground mt-1">Prizes Awarded</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

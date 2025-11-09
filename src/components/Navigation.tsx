import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import { useNavigate } from "react-router-dom";

interface NavigationProps {
  onLoginClick: () => void;
  onGetStartedClick: () => void;
}

export const Navigation = ({ onLoginClick, onGetStartedClick }: NavigationProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setMobileMenuOpen(false);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-background via-background/95 to-background backdrop-blur-xl border-b border-border/30 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
      <div className="container mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between h-24">
          {/* Logo */}
          <div 
            className="flex items-center gap-3 cursor-pointer hover:scale-105 transition-all duration-300 hover:drop-shadow-2xl" 
            onClick={() => {
              navigate("/");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <img src={logo} alt="Éclat Logo" className="h-16 w-auto filter drop-shadow-lg" />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-12">
            <button
              onClick={() => scrollToSection("about")}
              className="relative text-foreground/85 hover:text-primary transition-all duration-300 font-bold text-base tracking-tight hover:scale-110 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-primary after:to-accent after:transition-all after:duration-300 hover:after:w-full pb-1"
            >
              About
            </button>
            <button
              onClick={() => scrollToSection("features")}
              className="relative text-foreground/85 hover:text-primary transition-all duration-300 font-bold text-base tracking-tight hover:scale-110 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-primary after:to-accent after:transition-all after:duration-300 hover:after:w-full pb-1"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("leaderboard")}
              className="relative text-foreground/85 hover:text-primary transition-all duration-300 font-bold text-base tracking-tight hover:scale-110 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-primary after:to-accent after:transition-all after:duration-300 hover:after:w-full pb-1"
            >
              Leaderboard
            </button>
            <button
              onClick={() => scrollToSection("pricing")}
              className="relative text-foreground/85 hover:text-primary transition-all duration-300 font-bold text-base tracking-tight hover:scale-110 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-primary after:to-accent after:transition-all after:duration-300 hover:after:w-full pb-1"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollToSection("contact")}
              className="relative text-foreground/85 hover:text-primary transition-all duration-300 font-bold text-base tracking-tight hover:scale-110 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-primary after:to-accent after:transition-all after:duration-300 hover:after:w-full pb-1"
            >
              Contact
            </button>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-5">
            <Button 
              variant="outline" 
              onClick={onLoginClick} 
              className="font-bold text-base px-8 h-12 border-2 hover:border-primary hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Login
            </Button>
            <Button 
              variant="hero" 
              onClick={onGetStartedClick} 
              className="font-bold text-base px-8 h-12 shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition-all duration-300 hover:scale-105 bg-gradient-to-r from-primary to-accent"
            >
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2.5 text-foreground hover:text-primary transition-colors rounded-lg hover:bg-accent/50"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-6 space-y-2 border-t border-border/50 animate-fade-in bg-background">
            <button
              onClick={() => scrollToSection("about")}
              className="block w-full text-left px-5 py-3.5 text-foreground/90 hover:text-primary hover:bg-accent/50 rounded-lg transition-all duration-200 font-semibold text-[15px]"
            >
              About
            </button>
            <button
              onClick={() => scrollToSection("features")}
              className="block w-full text-left px-5 py-3.5 text-foreground/90 hover:text-primary hover:bg-accent/50 rounded-lg transition-all duration-200 font-semibold text-[15px]"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("leaderboard")}
              className="block w-full text-left px-5 py-3.5 text-foreground/90 hover:text-primary hover:bg-accent/50 rounded-lg transition-all duration-200 font-semibold text-[15px]"
            >
              Leaderboard
            </button>
            <button
              onClick={() => scrollToSection("pricing")}
              className="block w-full text-left px-5 py-3.5 text-foreground/90 hover:text-primary hover:bg-accent/50 rounded-lg transition-all duration-200 font-semibold text-[15px]"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollToSection("contact")}
              className="block w-full text-left px-5 py-3.5 text-foreground/90 hover:text-primary hover:bg-accent/50 rounded-lg transition-all duration-200 font-semibold text-[15px]"
            >
              Contact
            </button>
            <div className="px-4 pt-6 space-y-3 border-t border-border/50 mt-4">
              <Button variant="outline" className="w-full font-semibold text-[15px] h-11" onClick={onLoginClick}>
                Login
              </Button>
              <Button variant="hero" className="w-full font-semibold text-[15px] h-11 shadow-lg" onClick={onGetStartedClick}>
                Get Started
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

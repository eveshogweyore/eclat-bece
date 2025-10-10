import { Mail, Phone, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import logo from "@/assets/logo.png";

export const Footer = () => {
  return (
    <footer id="contact" className="bg-foreground text-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <img src={logo} alt="Éclat Logo" className="h-12 w-auto mb-4 brightness-0 invert" />
            <p className="text-background/80 max-w-md leading-relaxed">
              Éclat transforms exam preparation into an exciting competition. Join thousands of students learning smarter and winning rewards.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <a href="#about" className="text-background/80 hover:text-background transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="#features" className="text-background/80 hover:text-background transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-background/80 hover:text-background transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#leaderboard" className="text-background/80 hover:text-background transition-colors">
                  Leaderboard
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-lg mb-4">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <Mail size={16} className="text-background/80" />
                <a href="mailto:hello@eclat.app" className="text-background/80 hover:text-background transition-colors">
                  hello@eclat.app
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={16} className="text-background/80" />
                <a href="tel:+2341234567890" className="text-background/80 hover:text-background transition-colors">
                  +234 123 456 7890
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Social Links & Copyright */}
        <div className="pt-8 border-t border-background/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-background/60 text-sm">
            © 2025 Éclat. All rights reserved.
          </p>
          
          <div className="flex items-center gap-6">
            <a href="#" className="text-background/80 hover:text-background transition-colors">
              <Facebook size={20} />
            </a>
            <a href="#" className="text-background/80 hover:text-background transition-colors">
              <Twitter size={20} />
            </a>
            <a href="#" className="text-background/80 hover:text-background transition-colors">
              <Instagram size={20} />
            </a>
            <a href="#" className="text-background/80 hover:text-background transition-colors">
              <Linkedin size={20} />
            </a>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <a href="#" className="text-background/80 hover:text-background transition-colors">
              Privacy Policy
            </a>
            <span className="text-background/40">•</span>
            <a href="#" className="text-background/80 hover:text-background transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

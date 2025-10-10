import { Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PricingProps {
  onGetStartedClick: () => void;
}

export const Pricing = ({ onGetStartedClick }: PricingProps) => {
  const plans = [
    {
      name: "Free",
      price: "₦0",
      period: "forever",
      features: [
        "5 practice questions per day",
        "Basic leaderboard access",
        "Monthly competitions",
      ],
      cta: "Start Free",
      popular: false,
    },
    {
      name: "Monthly Premium",
      price: "₦1,500",
      period: "/month",
      features: [
        "Unlimited practice questions",
        "Full leaderboard access",
        "Priority competition entry",
        "Detailed performance analytics",
        "Win monthly cash prizes",
      ],
      cta: "Go Premium",
      popular: true,
    },
    {
      name: "Annual Premium",
      price: "₦10,000",
      period: "/year",
      features: [
        "Everything in Monthly Premium",
        "Save ₦8,000 per year",
        "Exclusive annual prizes",
        "Priority support",
        "Advanced learning insights",
      ],
      cta: "Best Value",
      popular: true,
    },
    {
      name: "School",
      price: "Custom",
      period: "pricing",
      description: "For schools and institutions",
      features: [
        "Everything in Premium",
        "Multi-user management",
        "Custom assignments",
        "Class analytics",
        "Dedicated support",
        "Custom branding",
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-primary-light/30">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in">
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground">
            Choose the plan that's right for you. Upgrade or downgrade anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative border-2 hover:shadow-hover transition-all duration-300 animate-slide-up ${
                plan.popular ? "border-accent shadow-glow" : "border-border"
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-accent text-accent-foreground text-sm font-semibold rounded-full shadow-glow">
                  Most Popular
                </div>
              )}
              <CardHeader className="text-center pb-8 pt-8">
                <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                <CardDescription className="mb-4">{plan.description}</CardDescription>
                <div className="mb-2">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  {plan.price !== "Custom" && <span className="text-muted-foreground"> / {plan.period}</span>}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="text-primary flex-shrink-0 mt-0.5" size={18} />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.popular ? "hero" : "outline"}
                  className="w-full"
                  size="lg"
                  onClick={onGetStartedClick}
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

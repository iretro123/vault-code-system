import { CalendarCheck, ExternalLink } from "lucide-react";

export default function AcademySupport() {
  return (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto px-4 py-10 md:py-16">
      {/* Icon */}
      <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
        <CalendarCheck className="h-7 w-7 text-primary" />
      </div>

      {/* Big headline */}
      <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground text-center uppercase leading-none">
        Tuesday &amp; Thursday
      </h1>

      <p className="text-lg md:text-xl font-semibold text-muted-foreground mt-3 text-center">
        Schedule 1:1
      </p>

      {/* Description */}
      <div className="mt-8 max-w-xl text-center space-y-4 text-sm md:text-base text-muted-foreground leading-relaxed">
        <p>
          These individual calls are designed to help you get the most out of Vault OS and move with clarity.
          We'll walk through navigation, answer questions, refine your personal game plan, and make sure you know exactly how to use the platform to support your trading goals.
        </p>
        <p>
          Any updates or support discussed during the call will be handled in real time when possible, with remaining changes completed within 24 hours after communication.
        </p>
      </div>

      {/* CTA Button */}
      <a
        href="https://calendly.com/rz_/vault-os-support-calls-1-on-1"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-10 inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-base transition-all duration-150 hover:brightness-110 active:scale-[0.98] shadow-lg shadow-primary/20"
      >
        <CalendarCheck className="h-5 w-5" />
        Book Your 1:1 Call
        <ExternalLink className="h-4 w-4 opacity-60" />
      </a>

      <p className="mt-4 text-xs text-muted-foreground/60">
        Opens Calendly in a new tab
      </p>
    </div>
  );
}

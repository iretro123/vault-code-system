import { Button } from "@/components/ui/button";
import { openExternalUrl } from "@/lib/externalLinks";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  Radio,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import vaultVLogo from "@/assets/vault-v-logo.png";

export const VAULT_BOOTCAMP_URL = "https://vaulttradingacademy.com/optin-6";

export default function AcademyBootcamp() {
  const navigate = useNavigate();
  const openBootcamp = () => openExternalUrl(VAULT_BOOTCAMP_URL);
  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/academy/community?tab=trade-floor", { replace: true });
  };

  return (
    <div className="min-h-full overflow-x-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.18),transparent_34%),linear-gradient(180deg,#03070d_0%,#050911_52%,#030508_100%)] px-4 pb-28 pt-4 text-white md:px-8 md:pb-12">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <header className="grid grid-cols-[44px_1fr_44px] items-center">
          <button
            type="button"
            onClick={goBack}
            aria-label="Go back"
            className="flex h-11 w-11 items-center justify-center rounded-2xl text-white/90 transition-colors hover:bg-white/10"
          >
            <ChevronLeft className="h-8 w-8" strokeWidth={2.6} />
          </button>
          <h1 className="text-center text-xl font-black tracking-[-0.02em] text-white">Bootcamp</h1>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-primary">
            <ShieldCheck className="h-7 w-7" strokeWidth={2.5} />
          </div>
        </header>

        <section className="relative overflow-hidden rounded-[1.45rem] border border-primary/15 bg-[radial-gradient(circle_at_78%_42%,rgba(37,99,235,0.34),transparent_27%),radial-gradient(circle_at_0%_18%,rgba(14,165,233,0.16),transparent_34%),linear-gradient(145deg,rgba(11,18,32,0.98),rgba(3,7,14,0.98))] p-4 shadow-[0_24px_85px_rgba(0,0,0,0.42)] md:p-5">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:42px_42px] opacity-20" />
          <div className="pointer-events-none absolute -right-16 top-20 h-56 w-56 rounded-full bg-primary/25 blur-[70px]" />
          <div className="relative z-10 grid gap-4 md:grid-cols-[1fr_0.92fr] md:items-center">
            <div>
              <div className="mb-5 flex items-center gap-4">
                <p className="text-[12px] font-black uppercase tracking-[0.24em] text-primary">21-Day Live Bootcamp</p>
                <div className="h-px flex-1 bg-gradient-to-r from-primary/70 to-transparent" />
              </div>
              <h2 className="text-[2.45rem] font-black uppercase leading-[0.98] tracking-[-0.055em] text-white md:text-6xl">
                Master the markets.
                <span className="block text-primary">Trade with confidence.</span>
              </h2>
              <p className="mt-5 max-w-xl text-base font-medium leading-7 text-slate-100/92 md:text-[1.05rem] md:leading-8">
                A 21-day live experience that takes you from setup to execution with structure, support, and real accountability.
              </p>
            </div>

            <div className="relative mx-auto flex min-h-[178px] w-full max-w-sm items-center justify-center overflow-hidden rounded-[1.35rem] border border-primary/10 bg-[radial-gradient(circle_at_50%_36%,rgba(59,130,246,0.36),transparent_32%),linear-gradient(180deg,rgba(15,23,42,0.5),rgba(2,6,23,0.2))] px-4 py-5 shadow-[inset_0_0_55px_rgba(37,99,235,0.16)] md:min-h-[220px] md:py-8">
              <div className="absolute bottom-8 left-8 right-8 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
              <div className="absolute bottom-7 left-1/2 h-28 w-32 -translate-x-1/2 bg-primary/20 blur-[36px]" />
              <div className="relative text-center">
                <img src={vaultVLogo} alt="" className="mx-auto h-16 w-16 object-contain drop-shadow-[0_0_24px_rgba(59,130,246,0.75)] md:h-20 md:w-20" />
                <p className="mt-3 text-xl font-black uppercase tracking-[0.12em] text-slate-200 drop-shadow-lg md:text-2xl">Day Trading</p>
                <p className="-mt-1 text-[1.05rem] font-black uppercase tracking-[0.35em] text-primary">Bootcamp</p>
                <p className="mt-1 text-[0.66rem] font-bold uppercase tracking-[0.32em] text-slate-300">Master the markets.</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-5 grid gap-3 rounded-[1.35rem] border border-white/10 bg-black/18 p-3 backdrop-blur md:grid-cols-3 md:p-4">
            <div className="flex items-center gap-3 md:border-r md:border-white/15">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-black uppercase text-white">Small Group</p>
                <p className="text-sm text-slate-300">10 seats max</p>
              </div>
            </div>
            <div className="flex items-center gap-3 md:border-r md:border-white/15">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Radio className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-black uppercase text-white">Live Coaching</p>
                <p className="text-sm text-slate-300">Daily structure</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-black uppercase text-white">Proven System</p>
                <p className="text-sm text-slate-300">Step-by-step</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.25rem] border border-primary/70 bg-[radial-gradient(circle_at_0%_10%,rgba(59,130,246,0.20),transparent_34%),linear-gradient(145deg,rgba(15,23,42,0.96),rgba(2,6,23,0.95))] p-4 shadow-[0_0_44px_rgba(37,99,235,0.18)]">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-primary/15 text-primary shadow-[0_0_32px_rgba(59,130,246,0.24)]">
              <CalendarDays className="h-8 w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-[12px] font-black uppercase tracking-[0.18em] text-primary">Next Bootcamp Starts</p>
                <span className="rounded-full border border-primary/40 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-primary">
                  9 spots left
                </span>
              </div>
              <h2 className="mt-2 text-xl font-black tracking-[-0.035em] text-white">Every Beginning of the Month</h2>
              <p className="mt-1 text-sm font-medium text-slate-400">Spots are limited.</p>
            </div>
          </div>
          <Button
            type="button"
            aria-label="Reserve My Seat"
            onClick={openBootcamp}
            className="mt-5 h-14 w-full rounded-2xl bg-gradient-to-r from-primary to-blue-600 text-[0.92rem] font-black uppercase tracking-[0.24em] text-white shadow-[0_16px_36px_rgba(37,99,235,0.34)] hover:from-blue-500 hover:to-primary"
          >
            Reserve My Seat
            <ArrowRight className="ml-4 h-6 w-6" />
          </Button>
        </section>
      </div>
    </div>
  );
}

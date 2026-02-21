import { useState } from "react";
import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Megaphone, MessageSquare, Trophy, ShieldCheck } from "lucide-react";
import { AnnouncementsFeed } from "@/components/academy/AnnouncementsFeed";
import { RoomChat } from "@/components/academy/RoomChat";
import { useAcademyRole } from "@/hooks/useAcademyRole";

const ROOM_RULES = [
  "Use the trade format: Ticker → Setup → Entry/Exit → Risk → Thesis.",
  "No spam, no self-promotion, no financial advice.",
  "Be respectful. Constructive feedback only.",
  "Screenshots encouraged — show your chart.",
  "Moderators may remove off-topic posts.",
];

const AcademyCommunity = () => {
  const [tab, setTab] = useState("announcements");
  const { isAdmin } = useAcademyRole();

  return (
    <AcademyLayout>
      <PageHeader title="Community" subtitle="Connect, share, and learn together" />
      <div className="px-4 md:px-6 pb-6 space-y-4">
        {/* Pinned Rules Card */}
        <Card className="p-4 max-w-3xl border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Rules of the Room</h3>
          </div>
          <ul className="space-y-1">
            {ROOM_RULES.map((rule, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-muted-foreground/40 shrink-0">{i + 1}.</span>
                {rule}
              </li>
            ))}
          </ul>
        </Card>

        <Tabs value={tab} onValueChange={setTab} className="space-y-4 max-w-3xl">
          <TabsList className="bg-white/[0.03] border border-white/[0.06] p-1 h-auto flex-wrap">
            <TabsTrigger value="announcements" className="gap-1.5 text-xs data-[state=active]:bg-white/[0.08] px-3 py-1.5">
              <Megaphone className="h-3.5 w-3.5" />
              Announcements
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-1.5 text-xs data-[state=active]:bg-white/[0.08] px-3 py-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Trade Floor
            </TabsTrigger>
            <TabsTrigger value="wins" className="gap-1.5 text-xs data-[state=active]:bg-white/[0.08] px-3 py-1.5">
              <Trophy className="h-3.5 w-3.5" />
              Wins / Proof
            </TabsTrigger>
          </TabsList>

          <TabsContent value="announcements">
            <AnnouncementsFeed />
          </TabsContent>

          <TabsContent value="chat">
            <RoomChat roomSlug="options-lounge" canPost={true} isAnnouncements={false} />
          </TabsContent>

          <TabsContent value="wins">
            <RoomChat roomSlug="trade-recaps" canPost={true} isAnnouncements={false} />
          </TabsContent>
        </Tabs>
      </div>
    </AcademyLayout>
  );
};

export default AcademyCommunity;

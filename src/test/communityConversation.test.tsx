import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { getDateLabel, shouldShowDateSeparator } from "@/components/academy/community/DateSeparator";
const mocks = vi.hoisted(() => ({ insert: vi.fn(), ensure: vi.fn(), error: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({user:{id:"member"},profile:{display_name:"Student"},userRole:{role:"member"}}) }));
vi.mock("@/hooks/useChatProfiles", () => ({useChatProfiles:()=>({ensureProfiles:mocks.ensure,getProfile:()=>null})}));
vi.mock("@/lib/chatAvatars",()=>({ChatAvatar:()=>null}));
vi.mock("sonner",()=>({toast:{error:mocks.error}}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{
 from:()=>({select:()=>({eq:()=>({order:()=>({limit:async()=>({data:[],error:null})})})}),insert:mocks.insert}),
 channel:()=>({on:()=>({subscribe:()=>({})})}),removeChannel:vi.fn()
}}));
import { ThreadDrawer } from "@/components/academy/community/ThreadDrawer";
const parent={id:"thread",room_slug:"trade-floor",user_id:"author",user_name:"Coach",body:"What do you see?",created_at:"2026-09-14T12:00:00Z",reply_count:0};
afterEach(()=>{cleanup();sessionStorage.clear();vi.useRealTimers();vi.clearAllMocks();});
it("uses calendar dates across a daylight-saving transition",()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date(2026,2,9,12));
 expect(getDateLabel(new Date(2026,2,8,12).toISOString())).toBe("Yesterday");
 expect(shouldShowDateSeparator(new Date(2026,2,9).toISOString(),new Date(2026,2,8).toISOString())).toBe(true);
});
it("keeps a reply when the network throws and re-enables sending",async()=>{
 HTMLElement.prototype.scrollTo=vi.fn();
 mocks.insert.mockRejectedValueOnce(new Error("offline"));
 render(<ThreadDrawer parentMessage={parent} onClose={()=>{}}/>);
 fireEvent.change(screen.getByLabelText("Reply in thread"),{target:{value:"My chart question"}});
 fireEvent.click(screen.getByLabelText("Send reply"));
 await waitFor(()=>expect(mocks.error).toHaveBeenCalled());
 expect((screen.getByLabelText("Reply in thread") as HTMLTextAreaElement).value).toBe("My chart question");
 expect((screen.getByLabelText("Send reply") as HTMLButtonElement).disabled).toBe(false);
 expect(mocks.ensure).toHaveBeenCalledWith(["author"]);
});
it("restores a thread draft after reopening without posting it",async()=>{
 HTMLElement.prototype.scrollTo=vi.fn();
 const view=render(<ThreadDrawer parentMessage={parent} onClose={()=>{}}/>);
 await screen.findByText("No replies yet. Start the conversation.");
 fireEvent.change(screen.getByLabelText("Reply in thread"),{target:{value:"Unsent question"}});
 view.unmount();
 render(<ThreadDrawer parentMessage={parent} onClose={()=>{}}/>);
 await screen.findByText("No replies yet. Start the conversation.");
 expect((screen.getByLabelText("Reply in thread") as HTMLTextAreaElement).value).toBe("Unsent question");
 expect(mocks.insert).not.toHaveBeenCalled();
});

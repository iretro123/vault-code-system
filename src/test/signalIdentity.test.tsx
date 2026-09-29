import {afterEach,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
vi.mock("@/lib/chatAvatars",()=>({ChatAvatar:({avatarUrl,userName}:{avatarUrl?:string;userName:string})=><img src={avatarUrl} alt={userName}/>}));
import {SignalCard} from "@/components/academy/chat/SignalCard";
afterEach(cleanup);
it.each(["signal-watchlist","signal-live"] as const)("keeps the author avatar on %s",(type)=>{
 const signal=type==="signal-watchlist"?{type,ticker:"SPY",bias:"neutral" as const}:{type,ticker:"SPY",direction:"calls" as const,strike:"500",exp:"2026-09-14"};
 render(<SignalCard signal={signal} userName="Member" userRole="Member" createdAt="2026-09-14T13:15:00Z" avatarUrl="https://example.com/avatar.png"/>);
 expect(screen.getByAltText("Member").getAttribute("src")).toBe("https://example.com/avatar.png");
 expect(screen.getByText("SPY")).toBeTruthy();
});
it("opens the original watchlist chart from the compact preview",()=>{
 const enlarge=vi.fn();
 render(<SignalCard signal={{type:"signal-watchlist",ticker:"SPY",bias:"bullish"}} chartImageUrl="https://example.com/full-resolution.png" userName="Member" userRole="Member" createdAt="2026-09-29T13:15:00Z" onImageClick={enlarge}/>);
 fireEvent.click(screen.getByRole("button",{name:"Enlarge SPY watchlist chart"}));
 expect(enlarge).toHaveBeenCalledWith("https://example.com/full-resolution.png");
});

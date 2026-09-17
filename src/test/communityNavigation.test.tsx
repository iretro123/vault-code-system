import {afterEach, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {MemoryRouter, useLocation} from "react-router-dom";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
const mocks = vi.hoisted(() => ({unread:vi.fn(), refresh:vi.fn()}));
vi.mock("@/hooks/useAuth", () => ({useAuth:()=>({session:{user:{id:"member"}},user:{id:"member"},profile:{},refetchProfile:mocks.refresh})}));
vi.mock("@/hooks/useAcademyPermissions", () => ({useAcademyPermissions:()=>({isCEO:false,isAdmin:false,isOperator:false})}));
vi.mock("@/hooks/useIsBasicTier", () => ({useIsBasicTier:()=>({isBasicTier:true,loading:false})}));
vi.mock("@/hooks/useUnreadCounts", () => ({useUnreadCounts:(...args:unknown[])=>{mocks.unread(...args);return {counts:{}}},formatBadge:()=>""}));
vi.mock("@/components/academy/community/CommunityTradeFloor", () => ({CommunityTradeFloor:()=> <div>Chat content</div>}));
vi.mock("@/components/academy/RoomChat", () => ({RoomChat:()=> <div>Room content</div>}));
import AcademyCommunity from "@/pages/academy/AcademyCommunity";
function Location(){return <output data-testid="location">{useLocation().search}</output>}
function renderCommunity(children: React.ReactNode) {
 return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}>{children}</QueryClientProvider>);
}
afterEach(() => {cleanup();vi.clearAllMocks();localStorage.clear();});
it("does not treat gated Signals as a read chat room",()=>{
 renderCommunity(<MemoryRouter><AcademyCommunity/></MemoryRouter>);
 fireEvent.click(screen.getByRole("button",{name:"Signals"}));
 expect(mocks.unread).toHaveBeenLastCalledWith(null,"member");
 fireEvent.click(screen.getByRole("button",{name:"Chat"}));
 expect(mocks.unread).toHaveBeenLastCalledWith("trade-floor","member");
});
it("keeps unrelated URL context when switching rooms",()=>{
 renderCommunity(<MemoryRouter initialEntries={["/academy/community?source=dashboard"]}><AcademyCommunity/><Location/></MemoryRouter>);
 fireEvent.click(screen.getByRole("button",{name:"Wins"}));
 expect(screen.getByTestId("location").textContent).toBe("?source=dashboard&tab=wins");
});
it("marks only the selected room for its blue active underline",()=>{
 renderCommunity(<MemoryRouter><AcademyCommunity/></MemoryRouter>);
 for (const name of ["Chat","Signals","Wins"]) {
  fireEvent.click(screen.getByRole("button",{name}));
  expect(screen.getByRole("button",{name}).getAttribute("aria-current")).toBe("page");
  expect(document.querySelectorAll('.community-room-tabs [aria-current="page"]').length).toBe(1);
 }
});
it("redirects removed calendar links to Chat without a dead end",()=>{
 localStorage.setItem('vault_community_tab','calendar');
 renderCommunity(<MemoryRouter initialEntries={['/academy/community?tab=calendar&source=saved']}><AcademyCommunity/><Location/></MemoryRouter>);
 expect(screen.queryByRole('button',{name:'Calendar'})).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Chat'})).toHaveAttribute('aria-current','page');
 expect(screen.getByTestId('location')).toHaveTextContent('?tab=trade-floor&source=saved');
 expect(document.querySelector('iframe')).toBeNull();
});

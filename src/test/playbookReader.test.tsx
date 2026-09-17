import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,act} from '@testing-library/react';
import {TooltipProvider} from '@/components/ui/tooltip';
import {PlaybookReader} from '@/components/playbook/PlaybookReader';
const pdf=vi.hoisted(()=>({document:null as any,page:null as any}));
vi.mock('react-pdf',()=>({pdfjs:{GlobalWorkerOptions:{}},Document:(props:any)=>{pdf.document=props;return <div>{props.children}</div>;},Page:(props:any)=>{pdf.page=props;return <div>Rendered PDF page {props.pageNumber}</div>;}}));
beforeEach(()=>{vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});HTMLElement.prototype.scrollTo=vi.fn();});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();});
const chapter={id:'intro',title:'Introduction',pdf_page_start:6,pdf_page_end:7,minutes_estimate:4} as any;
function mount(){const onPageChange=vi.fn(),onReachedEnd=vi.fn();render(<TooltipProvider><PlaybookReader chapter={chapter} pdfUrl="https://example.com/book.pdf" pdfLoading={false} pdfError={null} isLocked={false} onPageChange={onPageChange} onReachedEnd={onReachedEnd}/></TooltipProvider>);return {onPageChange,onReachedEnd};}
it('only reports the chapter end after the last page renders',()=>{
 const events=mount();
 act(()=>pdf.document.onLoadSuccess());act(()=>pdf.page.onRenderSuccess());
 fireEvent.click(screen.getByRole('button',{name:'Next'}));
 expect(events.onPageChange).toHaveBeenCalledWith(7);
 expect(events.onReachedEnd).not.toHaveBeenCalled();
 act(()=>pdf.page.onRenderSuccess());
 expect(events.onReachedEnd).toHaveBeenCalledTimes(1);
 fireEvent.change(screen.getByLabelText('Go to page'),{target:{value:'6'}});
 expect(screen.getByText('Rendered PDF page 6')).toBeTruthy();
});
it('offers recovery instead of an indefinite unexplained wait',()=>{
 vi.useFakeTimers();mount();act(()=>vi.advanceTimersByTime(12000));
 expect(screen.getByText('This is taking longer than usual.')).toBeTruthy();
 expect(screen.getByRole('link',{name:'Open PDF instead'}).getAttribute('href')).toBe('https://example.com/book.pdf');
 fireEvent.click(screen.getByRole('button',{name:'Try again'}));
 expect(screen.queryByText('This is taking longer than usual.')).toBeNull();
});
it('continues to the next chapter only when Next chapter is clicked',()=>{
 const next=vi.fn();
 render(<TooltipProvider><PlaybookReader chapter={chapter} pdfUrl="https://example.com/book.pdf" pdfLoading={false} pdfError={null} isLocked={false} onPageChange={vi.fn()} onReachedEnd={vi.fn()} onNextChapter={next} nextChapterTitle="Stock basics"/></TooltipProvider>);
 act(()=>pdf.document.onLoadSuccess());act(()=>pdf.page.onRenderSuccess());
 fireEvent.click(screen.getByRole('button',{name:'Next'}));
 expect(next).not.toHaveBeenCalled();
 act(()=>pdf.page.onRenderSuccess());
 fireEvent.click(screen.getByRole('button',{name:'Next chapter'}));
 expect(next).toHaveBeenCalledTimes(1);
});

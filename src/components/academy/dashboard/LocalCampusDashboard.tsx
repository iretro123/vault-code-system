import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAcademyLessons, AcademyLesson } from '@/hooks/useAcademyLessons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import TradingCampus from '@/design-studio/TradingCampus';
import '@/design-studio/trading-campus.css';
import './local-campus-dashboard.css';
import { TradingSetupCard } from '../setup/TradingSetup';

// Shared released dashboard: real profile/lesson reads; no automatic activity writes.
export default function LocalCampusDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { lessons, loading } = useAcademyLessons();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const visibleLessons = lessons.filter(lesson => lesson.visible !== false);
  const results = visibleLessons.filter(lesson => `${lesson.lesson_title} ${lesson.module_title}`.toLowerCase().includes(query.trim().toLowerCase()));
  const openLesson = (lesson: AcademyLesson) => {
    setSearchOpen(false);
    navigate(`/academy/learn/${encodeURIComponent(lesson.module_slug)}?lesson=${encodeURIComponent(lesson.id)}`);
  };
  function act(action: string) {
    switch (action) {
      case 'Live Trading classroom': navigate('/academy/live?class=trading&open=1'); break;
      case 'Wednesday Class': navigate('/academy/live?class=wednesday'); break;
      case 'One-on-one training': navigate('/academy/support'); break;
      case 'Community lounge':
      case 'Community discussion': navigate('/academy/community'); break;
      case 'Beginner Bridge': navigate('/academy/learn/chapter-1-basic-bridge'); break;
      case 'Explore the lesson': {
        const lesson = visibleLessons.find(item => /supply\s*(?:&|and)\s*demand.*ep\.?\s*1\b/i.test(item.lesson_title));
        if (lesson) openLesson(lesson);
        else { setQuery('Supply'); setSearchOpen(true); }
        break;
      }
      default: navigate('/academy/learn');
    }
  }
  const name = profile?.display_name?.split(' ')[0] || 'Trader';
  return <div className="vault-campus-dashboard">
    <div className="campus-content"><TradingCampus act={act} memberName={name} afterWelcome={<TradingSetupCard/>}/><footer className="campus-footer"><span>VAULT ACADEMY</span><span>Learn with intention. Grow together.</span></footer></div>
    <Dialog open={searchOpen} onOpenChange={setSearchOpen}><DialogContent className="campus-search"><DialogHeader><DialogTitle>Find your next lesson</DialogTitle><DialogDescription>Search the Vault lesson library.</DialogDescription></DialogHeader><Input aria-label="Search lesson titles" placeholder="Try supply, demand, or foundations" value={query} onChange={event => setQuery(event.target.value)}/><div className="campus-search-results">{loading ? <p>Loading lessons…</p> : results.length ? results.map(lesson => <button key={lesson.id} onClick={() => openLesson(lesson)}><span><strong>{lesson.lesson_title}</strong><small>{lesson.module_title}</small></span><ArrowUpRight size={18}/></button>) : <p>No lessons found. Try another word or browse the library.</p>}</div><button className="campus-library-link" onClick={() => {setSearchOpen(false); navigate('/academy/learn');}}>Browse all lessons <ArrowUpRight size={17}/></button></DialogContent></Dialog>
  </div>;
}

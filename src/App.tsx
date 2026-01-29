import { useState, useMemo } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Quiz } from './components/Quiz';
import { IonReference } from './components/IonReference';
import { Config } from './components/Config';
import { Profile } from './components/Profile';
import { Leaderboard } from './components/Leaderboard';
import { AuthModal } from './components/AuthModal';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ions } from './data/ions';
import { FlaskConical, List, Settings, Trophy, User as UserIcon, Menu, X } from 'lucide-react';
import './App.css';

type Tab = 'quiz' | 'ions' | 'config' | 'leaderboard' | 'profile';

function AppContent() {
  const [tab, setTab] = useState<Tab>('quiz');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  const [selectedIonNames, setSelectedIonNames] = useState<Set<string>>(
    new Set(ions.map(i => i.name))
  );

  const toggleIon = (name: string) => {
    const newSet = new Set(selectedIonNames);
    if (newSet.has(name)) {
      newSet.delete(name);
    } else {
      newSet.add(name);
    }
    setSelectedIonNames(newSet);
  };

  const toggleGroup = (names: string[], shouldSelect: boolean) => {
    const newSet = new Set(selectedIonNames);
    names.forEach(name => {
      if (shouldSelect) {
        newSet.add(name);
      } else {
        newSet.delete(name);
      }
    });
    setSelectedIonNames(newSet);
  };

  const selectAll = () => {
    setSelectedIonNames(new Set(ions.map(i => i.name)));
  };

  const deselectAll = () => {
    setSelectedIonNames(new Set());
  };

  const activeIons = useMemo(() => {
    return ions.filter(i => selectedIonNames.has(i.name));
  }, [selectedIonNames]);

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none; }
          .mobile-menu-btn { display: flex; }
          .mobile-nav {
            display: ${isMobileMenuOpen ? 'flex' : 'none'};
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.95);
            z-index: 999;
            flex-direction: column;
            padding: 2rem;
            gap: 1rem;
          }
          .mobile-nav button {
            width: 100%;
            justify-content: center;
            padding: 1rem;
            font-size: 1.1rem;
          }
        }
        @media (min-width: 769px) {
          .mobile-menu-btn { display: none; }
          .mobile-nav { display: none; }
        }
      `}</style>

      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '1rem',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        position: 'relative',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        {/* Mobile Menu Button */}
        <button
          className="mobile-menu-btn btn btn-ghost"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{ padding: '0.5rem' }}
        >
          <Menu size={24} />
        </button>

        {/* Desktop Navigation */}
        <nav className="desktop-nav" style={{ display: 'flex', gap: '1rem', flex: 1, justifyContent: 'center' }}>
          <button
            className={`btn ${tab === 'quiz' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab('quiz')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <FlaskConical size={20} /> Quiz
          </button>
          <button
            className={`btn ${tab === 'ions' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab('ions')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <List size={20} /> All Ions
          </button>
          <button
            className={`btn ${tab === 'config' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab('config')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Settings size={20} /> Config
          </button>
          <button
            className={`btn ${tab === 'leaderboard' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab('leaderboard')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Trophy size={20} /> Leaderboard
          </button>
        </nav>

        {/* Auth Button */}
        <div>
          {user ? (
            <button
              className={`btn ${tab === 'profile' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTab('profile')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <UserIcon size={20} /> <span className="desktop-only">{user.username}</span>
            </button>
          ) : (
            <button
              className="btn btn-ghost"
              onClick={() => setIsAuthOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <UserIcon size={20} /> <span className="desktop-only">Login</span>
            </button>
          )}
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      <div className="mobile-nav">
        <button
          style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'white' }}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <X size={32} />
        </button>
        <button
          className={`btn ${tab === 'quiz' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => handleTabChange('quiz')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', borderColor: 'white' }}
        >
          <FlaskConical size={20} /> Quiz
        </button>
        <button
          className={`btn ${tab === 'ions' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => handleTabChange('ions')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', borderColor: 'white' }}
        >
          <List size={20} /> All Ions
        </button>
        <button
          className={`btn ${tab === 'config' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => handleTabChange('config')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', borderColor: 'white' }}
        >
          <Settings size={20} /> Config
        </button>
        <button
          className={`btn ${tab === 'leaderboard' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => handleTabChange('leaderboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', borderColor: 'white' }}
        >
          <Trophy size={20} /> Leaderboard
        </button>
        {user && (
          <button
            className={`btn ${tab === 'profile' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => handleTabChange('profile')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', borderColor: 'white' }}
          >
            <UserIcon size={20} /> Profile
          </button>
        )}
      </div>

      <main>
        {tab === 'quiz' && <Quiz ions={activeIons} />}
        {tab === 'ions' && <IonReference ions={ions} />}
        {tab === 'config' && (
          <Config
            allIons={ions}
            selectedIonNames={selectedIonNames}
            onToggle={toggleIon}
            onToggleGroup={toggleGroup}
            onSelectAll={selectAll}
            onDeselectAll={deselectAll}
          />
        )}
        {tab === 'leaderboard' && <Leaderboard />}
        {tab === 'profile' && <Profile />}
      </main>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      <footer style={{
        marginTop: 'auto',
        textAlign: 'center',
        opacity: 0.5,
        fontSize: '0.85rem',
        paddingTop: '2rem'
      }}>
        <p>ChemIon Practice Clone | Built with React & Vanilla CSS</p>
      </footer>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

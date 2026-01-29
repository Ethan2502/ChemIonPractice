import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Ion } from '../data/ions';
import { ChevronDown, ChevronUp, Timer, Trophy } from 'lucide-react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Sparkle } from './Sparkle';

interface QuizProps {
    ions: Ion[];
}

type Mode = 'formula-to-name' | 'name-to-formula' | 'mixed';
type QuestionType = 'formula-to-name' | 'name-to-formula';

const SPRINT_COUNT = 10;

export const Quiz: React.FC<QuizProps> = ({ ions }) => {
    const { user } = useAuth();
    const [mode, setMode] = useState<Mode>('name-to-formula');
    const [isSprint, setIsSprint] = useState(false);
    const [sprintState, setSprintState] = useState<'idle' | 'running' | 'finished'>('idle');
    const [sprintCount, setSprintCount] = useState(0);
    const [startTime, setStartTime] = useState<number>(0);
    const [endTime, setEndTime] = useState<number>(0);
    const [currentTime, setCurrentTime] = useState<number>(0);

    const [currentIon, setCurrentIon] = useState<Ion | null>(null);
    const [questionType, setQuestionType] = useState<QuestionType>('name-to-formula');
    const [input, setInput] = useState('');

    const [feedback, setFeedback] = useState<{ type: 'error' | 'success', message: string } | null>(null);
    const [sparkleTrigger, setSparkleTrigger] = useState(0);
    const [missedQuestions, setMissedQuestions] = useState<{ question: string; answer: string; userAnswer: string }[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const timerRef = useRef<any>(null);

    const getQuestionType = useCallback((selectedMode: Mode): QuestionType => {
        if (selectedMode === 'mixed') {
            return Math.random() > 0.5 ? 'name-to-formula' : 'formula-to-name';
        }
        return selectedMode;
    }, []);

    const pickNewQuestion = useCallback(() => {
        if (ions.length === 0) {
            setCurrentIon(null);
            return;
        }
        const randomIon = ions[Math.floor(Math.random() * ions.length)];
        setCurrentIon(randomIon);
        setQuestionType(getQuestionType(mode));
        setInput('');
        setFeedback(null);
        setTimeout(() => inputRef.current?.focus(), 10);
    }, [ions, mode, getQuestionType]);

    // Timer logic
    useEffect(() => {
        if (isSprint && sprintState === 'running') {
            timerRef.current = setInterval(() => {
                setCurrentTime(Date.now() - startTime);
            }, 100);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [isSprint, sprintState, startTime]);

    // Initial load
    useEffect(() => {
        if (!isSprint) pickNewQuestion();
    }, [pickNewQuestion, isSprint]);

    const startSprint = () => {
        setIsSprint(true);
        setSprintState('running');
        setSprintCount(0);
        setStartTime(Date.now());
        setCurrentTime(0);
        setMissedQuestions([]);
        pickNewQuestion();
    };

    const finishSprint = async () => {
        setSprintState('finished');
        const finalTime = Date.now() - startTime;
        setEndTime(finalTime);

        if (user) {
            try {
                await api.post('/scores', {
                    mode: `Sprint-${SPRINT_COUNT}`,
                    timeMs: finalTime
                });
            } catch (e) {
                console.error("Failed to save score", e);
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentIon) return;
        const cleanInput = input.trim();
        if (!cleanInput) return;

        let isCorrect = false;
        let expectedAnswer = '';

        if (questionType === 'name-to-formula') {
            if (cleanInput === currentIon.formula) isCorrect = true;
            expectedAnswer = currentIon.formula;
        } else {
            if (cleanInput.toLowerCase() === currentIon.name.toLowerCase()) isCorrect = true;
            expectedAnswer = currentIon.name;
        }

        if (isCorrect) {
            setSparkleTrigger(prev => prev + 1); // Trigger sparkle animation
            if (isSprint && sprintState === 'running') {
                const newCount = sprintCount + 1;
                setSprintCount(newCount);
                if (newCount >= SPRINT_COUNT) {
                    finishSprint();
                    return;
                }
            }
            pickNewQuestion();
        } else {
            setFeedback({ type: 'error', message: `Wrong. Answer: ${expectedAnswer}` });
            setMissedQuestions(prev => [
                ...prev,
                {
                    question: questionType === 'name-to-formula' ? currentIon.name : currentIon.formula,
                    answer: expectedAnswer,
                    userAnswer: cleanInput
                }
            ]);
            inputRef.current?.select();
        }
    };

    const toggleShowHistory = () => setShowHistory(!showHistory);

    const formatTime = (ms: number) => (ms / 1000).toFixed(1);

    if (ions.length === 0) {
        return (
            <div className="card" style={{ textAlign: 'center' }}>
                <h2 className="title">No Ions Selected</h2>
                <p>Please select ions to practice.</p>
            </div>
        );
    }

    return (
        <div className="fade-enter-active">
            <Sparkle trigger={sparkleTrigger} targetRef={inputRef} />
            {/* Mode Selection */}
            {!isSprint && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                    {(['name-to-formula', 'formula-to-name', 'mixed'] as const).map((m) => (
                        <button
                            key={m}
                            className={`btn ${mode === m ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => { setMode(m); pickNewQuestion(); }}
                            style={{ textTransform: 'capitalize' }}
                        >
                            {m.replace(/-/g, ' ')}
                        </button>
                    ))}
                    <button
                        className="btn btn-outline"
                        style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                        onClick={startSprint}
                    >
                        <Timer size={16} style={{ marginRight: '0.5rem' }} /> Sprint ({SPRINT_COUNT})
                    </button>
                </div>
            )}

            {isSprint && (
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', fontSize: '1.2rem', fontWeight: 600 }}>
                        <span>Progress: {sprintCount} / {SPRINT_COUNT}</span>
                        <span>Time: {formatTime(sprintState === 'finished' ? endTime : currentTime)}s</span>
                    </div>
                    {sprintState === 'finished' && (
                        <div className="card" style={{ marginTop: '1rem', backgroundColor: 'rgba(0,0,0,0.03)' }}>
                            <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--color-correct)' }}>
                                <Trophy /> Sprint Complete!
                            </h2>
                            <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: '1rem 0' }}>{formatTime(endTime)}s</p>
                            {!user && <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Login to save your high scores!</p>}
                            <button className="btn btn-primary" onClick={() => setIsSprint(false)}>Back to Practice</button>
                        </div>
                    )}
                </div>
            )}

            {/* Question Card (Hide if sprint finished) */}
            {(!isSprint || sprintState === 'running') && (
                <div className="card" style={{ textAlign: 'center', minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ fontSize: '1.25rem', marginBottom: '1rem', opacity: 0.6 }}>
                        {questionType === 'name-to-formula' ? 'Name' : 'Formula'}
                    </div>

                    <div style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '2rem' }}>
                        {currentIon ? (questionType === 'name-to-formula' ? currentIon.name : currentIon.formula) : '...'}
                    </div>

                    <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '400px' }}>
                        <input
                            ref={inputRef}
                            type="text"
                            className="input"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={questionType === 'name-to-formula' ? 'Enter formula (e.g. SO42-)' : 'Enter name'}
                            autoComplete="off"
                            autoCorrect="off" // No spell check for chemicals
                            autoCapitalize="off"
                            style={{ textAlign: 'center' }}
                            autoFocus
                        />

                        {feedback && (
                            <div className="error-text fade-enter-active">
                                {feedback.message}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: '1rem', fontSize: '1.1rem' }}
                        >
                            Check
                        </button>
                    </form>
                </div>
            )}

            {/* Missed Questions */}
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <button
                    className="btn btn-ghost"
                    onClick={toggleShowHistory}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}
                >
                    {showHistory ? 'Hide' : 'See'} What You Got Wrong
                    {showHistory ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {showHistory && (
                    <div className="card fade-enter-active" style={{ marginTop: '1rem', textAlign: 'left' }}>
                        {missedQuestions.length === 0 ? (
                            <p style={{ textAlign: 'center', opacity: 0.5 }}>No missed questions yet.</p>
                        ) : (
                            <ul style={{ listStyle: 'none' }}>
                                {missedQuestions.map((item, idx) => (
                                    <li key={idx} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                                        <span style={{ fontWeight: 600 }}>{item.question}</span>
                                        <span style={{ margin: '0 0.5rem', opacity: 0.5 }}>→</span>
                                        <span style={{ color: 'var(--color-error)' }}>{item.userAnswer}</span>
                                        <span style={{ margin: '0 0.5rem', opacity: 0.5 }}>(Correct: <span style={{ color: 'var(--color-success)' }}>{item.answer}</span>)</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

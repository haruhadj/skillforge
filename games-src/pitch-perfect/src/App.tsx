import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GamePhase, RoundData } from './types';
import { generateRandomFrequency, calculateScore } from './utils';
import { AudioService } from './services/AudioService';

// Import components
import Waveform from './components/Waveform';
import PhaseStart from './components/PhaseStart';
import PhaseMemorize from './components/PhaseMemorize';
import PhaseInput from './components/PhaseInput';
import PhaseResults from './components/PhaseResults';
import PhaseSummary from './components/PhaseSummary';

const TOTAL_ROUNDS = 5;
const GAME_TIME_LIMIT = 150; // Challenge Timer in seconds

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('START');
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState<number>(1);
  const [timeLeft, setTimeLeft] = useState<number>(GAME_TIME_LIMIT);
  const [playCount, setPlayCount] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);

  // Wave visual state synchronizers
  const [waveActive, setWaveActive] = useState<boolean>(false);
  const [waveFreq, setWaveFreq] = useState<number>(220.00);
  const [waveTheme, setWaveTheme] = useState<'target' | 'guess' | 'idle'>('idle');

  // Load High Score on mount
  useEffect(() => {
    const saved = localStorage.getItem('pitch_perfect_high_score');
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed)) {
        setHighScore(parsed);
      }
    }
  }, []);

  // Countdown timer during Memorize focus window
  useEffect(() => {
    if (phase !== 'MEMORIZE') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Timeout! Force input phase
          setPhase('GUESS');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase]);

  // Handle setting appropriate wave theme depending on the active game phase
  useEffect(() => {
    if (phase === 'MEMORIZE') {
      setWaveTheme('target');
      if (rounds[currentRoundIndex - 1]) {
        setWaveFreq(rounds[currentRoundIndex - 1].targetFreq);
      }
    } else if (phase === 'GUESS') {
      setWaveTheme('guess');
    } else if (phase === 'RESULTS') {
      setWaveTheme('guess');
    } else {
      setWaveTheme('idle');
      setWaveActive(false);
    }
  }, [phase, currentRoundIndex, rounds]);

  // Starts a brand new game challenge
  const handleStartGame = () => {
    AudioService.init();
    
    // Generate 5 target frequencies
    const newRounds: RoundData[] = Array.from({ length: TOTAL_ROUNDS }, () => ({
      targetFreq: generateRandomFrequency(),
      guessedFreq: null,
      score: null,
      centsDifference: null,
    }));

    setRounds(newRounds);
    setCurrentRoundIndex(1);
    setPlayCount(0);
    setTimeLeft(GAME_TIME_LIMIT);
    setWaveFreq(newRounds[0].targetFreq);
    setPhase('MEMORIZE');
  };

  const handleNextPhase = () => {
    AudioService.stopTone();
    setWaveActive(false);
    setPhase('GUESS');
  };

  const handleIncrementPlayCount = () => {
    setPlayCount((prev) => prev + 1);
  };

  const handleSubmitGuess = (guessedFreq: number) => {
    AudioService.stopTone();
    setWaveActive(false);

    const activeRound = rounds[currentRoundIndex - 1];
    const { score, cents } = calculateScore(guessedFreq, activeRound.targetFreq);

    // Save guess and score metrics
    const updatedRounds = [...rounds];
    updatedRounds[currentRoundIndex - 1] = {
      ...activeRound,
      guessedFreq,
      score,
      centsDifference: cents,
    };

    setRounds(updatedRounds);
    setPhase('RESULTS');
  };

  const handleNextRound = () => {
    AudioService.stopTone();
    setWaveActive(false);

    if (currentRoundIndex < TOTAL_ROUNDS) {
      // Advance to next round
      const nextIdx = currentRoundIndex + 1;
      setCurrentRoundIndex(nextIdx);
      setPlayCount(0);
      setTimeLeft(GAME_TIME_LIMIT);
      
      const nextRound = rounds[nextIdx - 1];
      if (nextRound) {
        setWaveFreq(nextRound.targetFreq);
      }
      
      setPhase('MEMORIZE');
    } else {
      // Game Over, compile summary
      const totalScore = rounds.reduce((acc, r) => acc + (r.score || 0), 0);
      if (totalScore > highScore) {
        setHighScore(totalScore);
        localStorage.setItem('pitch_perfect_high_score', totalScore.toString());
      }
      setPhase('SUMMARY');
    }
  };

  const handleRestart = () => {
    handleStartGame();
  };

  // Compute suitable amplitude for our WebGL/Canvas Waveform visualizer
  const getWaveAmplitude = () => {
    if (!waveActive) return 0.05; // Gentle background idle vibration
    if (phase === 'MEMORIZE') return 1.0; // Strong signal pulses when playing target
    if (phase === 'GUESS') return 1.0;
    if (phase === 'RESULTS') return 0.8;
    return 0.05;
  };

  return (
    <div id="game-root" className="min-h-screen h-[100dvh] bg-black text-white flex flex-col justify-center items-center overflow-hidden font-sans relative antialiased">
      
      {/* Decorative starry or digital atmosphere lights in background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(88,28,135,0.08)_0%,rgba(0,0,0,0)_70%)] pointer-events-none" />
      <div className="absolute top-10 left-10 w-48 h-48 bg-purple-500/5 rounded-full filter blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-10 right-10 w-60 h-60 bg-cyan-500/5 rounded-full filter blur-3xl pointer-events-none" style={{ animationDelay: '2s' }} />

      {/* Frame wrapper simulating a premium mobile device shell on wider interfaces */}
      <div className="w-full h-full max-w-md md:max-h-[850px] md:h-[90%] md:rounded-[40px] md:border md:border-zinc-900 bg-zinc-950/20 backdrop-blur-md relative overflow-hidden flex flex-col shadow-2xl md:shadow-purple-500/5">
        
        {/* Render Canvas wave in the absolute background of this page frame */}
        <Waveform
          frequency={waveFreq}
          amplitude={getWaveAmplitude()}
          theme={waveTheme}
          isActive={waveActive}
        />

        {/* Phase Navigation with fading route-like transition animations */}
        <AnimatePresence mode="wait">
          {phase === 'START' && (
            <motion.div
              key="start"
              className="w-full h-full absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <PhaseStart
                onStart={handleStartGame}
                highScore={highScore}
              />
            </motion.div>
          )}

          {phase === 'MEMORIZE' && (
            <motion.div
              key="memorize"
              className="w-full h-full absolute inset-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <PhaseMemorize
                roundIndex={currentRoundIndex}
                totalRounds={TOTAL_ROUNDS}
                targetFreq={rounds[currentRoundIndex - 1]?.targetFreq || 100}
                timeLeft={timeLeft}
                onTimeTick={() => {}}
                onNextPhase={handleNextPhase}
                playCount={playCount}
                incrementPlayCount={handleIncrementPlayCount}
                setWaveActive={setWaveActive}
              />
            </motion.div>
          )}

          {phase === 'GUESS' && (
            <motion.div
              key="guess"
              className="w-full h-full absolute inset-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <PhaseInput
                roundIndex={currentRoundIndex}
                totalRounds={TOTAL_ROUNDS}
                initialFreq={440.00} // Default middle concert pitch to start
                onSubmitGuess={handleSubmitGuess}
                setWaveActive={setWaveActive}
                setWaveFreq={setWaveFreq}
              />
            </motion.div>
          )}

          {phase === 'RESULTS' && (
            <motion.div
              key="results"
              className="w-full h-full absolute inset-0"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <PhaseResults
                roundIndex={currentRoundIndex}
                totalRounds={TOTAL_ROUNDS}
                targetFreq={rounds[currentRoundIndex - 1]?.targetFreq || 100}
                guessedFreq={rounds[currentRoundIndex - 1]?.guessedFreq || 100}
                score={rounds[currentRoundIndex - 1]?.score || 0}
                centsDifference={rounds[currentRoundIndex - 1]?.centsDifference || 0}
                onNextRound={handleNextRound}
                setWaveActive={setWaveActive}
                setWaveFreq={setWaveFreq}
              />
            </motion.div>
          )}

          {phase === 'SUMMARY' && (
            <motion.div
              key="summary"
              className="w-full h-full absolute inset-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <PhaseSummary
                rounds={rounds}
                onRestart={handleRestart}
                highScore={highScore}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';

export default function ChooseGame() {
  const router = useRouter();

  const games = [
    {
      id: 1,
      name: "Spin the Wheel",
      description: "Random selection with a spinning wheel",
      icon: "🎡",
      route: "/games/spin-wheel",
      color: "from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30",
      border: "border-green-200 dark:border-green-700",
      button: "bg-green-500 hover:bg-green-600"
    },
    {
      id: 2,
      name: "Rock Paper Scissors",
      description: "Classic game against the computer",
      icon: "✂️",
      route: "/games/rock-paper-scissors",
      color: "from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30",
      border: "border-blue-200 dark:border-blue-700",
      button: "bg-blue-500 hover:bg-blue-600"
    },
    {
      id: 3,
      name: "Dice Roll",
      description: "Roll virtual dice for decisions",
      icon: "🎲",
      route: "/games/dice-roll",
      color: "from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30",
      border: "border-red-200 dark:border-red-700",
      button: "bg-red-500 hover:bg-red-600"
    },
    {
      id: 4,
      name: "Coin Flip",
      description: "Heads or tails for quick decisions",
      icon: "🪙",
      route: "/games/coin-flip",
      color: "from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30",
      border: "border-yellow-200 dark:border-yellow-700",
      button: "bg-amber-500 hover:bg-amber-600"
    },
    {
      id: 5,
      name: "Number Picker",
      description: "Pick random numbers within a range",
      icon: "🔢",
      route: "/games/number-picker",
      color: "from-indigo-100 to-violet-100 dark:from-indigo-900/30 dark:to-violet-900/30",
      border: "border-indigo-200 dark:border-indigo-700",
      button: "bg-indigo-500 hover:bg-indigo-600"
    },
    {
      id: 6,
      name: "Card Shuffler",
      description: "Draw random cards from a deck",
      icon: "🃏",
      route: "/games/card-shuffler",
      color: "from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30",
      border: "border-pink-200 dark:border-pink-700",
      button: "bg-pink-500 hover:bg-pink-600"
    }
  ];

  const navigateToGame = (route) => {
    router.push(route);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] py-12 px-4">
      {/* navbar at the top */}
      <Navbar />

      <div className="max-w-7xl mx-auto mt-12">
        {/* header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[var(--nav-bg)] to-[var(--accent)] bg-clip-text text-transparent mb-4">
            choose your game
          </h1>
          <p className="text-xl text-[var(--muted)] max-w-2xl mx-auto">
            pick from classic decision-making games. perfect for quick choices and fun moments!
          </p>
        </div>

        {/* games grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 mb-12">
          {games.map((game) => (
            <div 
              key={game.id}
              className={`
                bg-gradient-to-br from-white/60 to-white/40 dark:from-black/40 dark:to-black/20 
                rounded-2xl p-6 border-2 ${game.border}
                shadow-lg hover:shadow-xl transition-all duration-300 
                hover:scale-105 backdrop-blur-sm
                flex flex-col h-full
              `}
            >
              {/* game icon */}
              <div className="text-5xl mb-4 text-center">{game.icon}</div>
              
              {/* game info */}
              <div className="flex-grow text-center">
                <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">
                  {game.name}
                </h3>
                <p className="text-[var(--muted)] mb-4 text-sm">
                  {game.description}
                </p>
              </div>

              {/* play button */}
              <button
                onClick={() => navigateToGame(game.route)}
                className={`
                  w-full text-white font-semibold py-3 px-4 rounded-xl 
                  transition-all duration-200 transform hover:scale-105 
                  shadow-lg hover:shadow-xl mt-auto
                  ${game.button}
                `}
              >
                play game
              </button>
            </div>
          ))}
        </div>

        {/* random game button */}
        <div className="text-center">
          <button
            onClick={() => {
              const randomGame = games[Math.floor(Math.random() * games.length)];
              navigateToGame(randomGame.route);
            }}
            className="bg-gradient-to-r from-[var(--nav-bg)] to-[var(--accent)] 
                       text-white font-bold py-4 px-10 rounded-full 
                       hover:scale-105 transition-transform duration-200 
                       shadow-2xl hover:shadow-3xl text-lg"
          >
            🎲 surprise me! choose a random game
          </button>
        </div>
      </div>
    </div>
  );
}
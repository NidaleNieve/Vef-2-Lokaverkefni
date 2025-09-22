export default function Results({ restaurants, acceptedIds, rejectedIds, onRestart }) {
  const accepted = restaurants.filter(r => acceptedIds.includes(r.id));
  const rejected = restaurants.filter(r => rejectedIds.includes(r.id));

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="bg-[var(--nav-item-bg)] rounded-2xl p-8 max-w-4xl w-full
                      shadow-[0_10px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_10px_30px_rgba(128,128,128,0.15)]
                      border border-white/30 backdrop-blur-sm">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            Your Results
          </h2>
          <p className="text-[var(--muted)] mt-2">Here's how you decided</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Accepted Section */}
          <div className="bg-gradient-to-br from-white/60 to-white/40 dark:from-black/40 dark:to-black/20 
                          rounded-xl p-6 border border-green-100/50 dark:border-green-800/30
                          shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <h3 className="font-bold text-lg text-green-700 dark:text-green-300">
                Accepted
              </h3>
              <span className="ml-auto bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 
                             px-2 py-1 rounded-full text-sm font-medium">
                {accepted.length}
              </span>
            </div>
            
            {accepted.length > 0 ? (
              <ul className="space-y-3">
                {accepted.map((r, index) => (
                  <li key={r.id} 
                      className="flex items-center gap-3 p-3 rounded-lg bg-white/50 dark:bg-black/30 
                                 border border-green-50 dark:border-green-900/20
                                 transform transition-transform hover:scale-[1.02]">
                    <span className="flex items-center justify-center w-6 h-6 bg-green-100 dark:bg-green-900 
                                   text-green-600 dark:text-green-400 rounded-full text-sm font-medium">
                      {index + 1}
                    </span>
                    <span className="font-medium">{r.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 bg-green-100 dark:bg-green-900/30 rounded-full 
                              flex items-center justify-center">
                  <span className="text-2xl">🍽️</span>
                </div>
                <p className="text-[var(--muted)]">No restaurants accepted yet</p>
              </div>
            )}
          </div>

          {/* Rejected Section */}
          <div className="bg-gradient-to-br from-white/60 to-white/40 dark:from-black/40 dark:to-black/20 
                          rounded-xl p-6 border border-red-100/50 dark:border-red-800/30
                          shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <h3 className="font-bold text-lg text-red-700 dark:text-red-300">
                Rejected
              </h3>
              <span className="ml-auto bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 
                             px-2 py-1 rounded-full text-sm font-medium">
                {rejected.length}
              </span>
            </div>
            
            {rejected.length > 0 ? (
              <ul className="space-y-3">
                {rejected.map((r, index) => (
                  <li key={r.id} 
                      className="flex items-center gap-3 p-3 rounded-lg bg-white/50 dark:bg-black/30 
                                 border border-red-50 dark:border-red-900/20
                                 transform transition-transform hover:scale-[1.02]">
                    <span className="flex items-center justify-center w-6 h-6 bg-red-100 dark:bg-red-900 
                                   text-red-600 dark:text-red-400 rounded-full text-sm font-medium">
                      {index + 1}
                    </span>
                    <span className="font-medium">{r.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 bg-red-100 dark:bg-red-900/30 rounded-full 
                              flex items-center justify-center">
                  <span className="text-2xl">❌</span>
                </div>
                <p className="text-[var(--muted)]">No restaurants rejected</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
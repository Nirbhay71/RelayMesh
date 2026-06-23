import Hero from './components/Hero';

function App() {
  return (
    <main className="min-h-screen bg-white">
      <Hero />
      {/* Spacer for scrolling - increased for better reveal interaction */}
      <div className="h-[300vh] bg-white" />
    </main>
  );
}

export default App;

import React, { useState, useEffect } from 'react';

function getWindDirection(degrees) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((degrees %= 360) < 0 ? degrees + 360 : degrees) / 45) % 8;
  return directions[index];
}

export default function App() {
  const [activeScreen, setActiveScreen] = useState('dashboard');
  
  // Log Catch States
  const speciesList = ['RED DRUM', 'FLOUNDER', 'TROUT', 'SPANISH', 'WHITING', 'OTHER'];
  const baitList = ['LIVE', 'CUT', 'ARTIF', 'FLEA'];
  const [length, setLength] = useState(18);
  const [selectedSpecies, setSelectedSpecies] = useState('RED DRUM');
  const [selectedBait, setSelectedBait] = useState('CUT');

  const [tideLevel, setTideLevel] = useState('--');
  const [tideDirection, setTideDirection] = useState('SYNCING...');
  const [nextTideInfo, setNextTideInfo] = useState('NEXT TIDE: --');
  const [windData, setWindData] = useState('-- MPH');
  const [waterTemp, setWaterTemp] = useState('-- °F');
  const [isSyncing, setIsSyncing] = useState(true);

  const [matrixRecommendation, setMatrixRecommendation] = useState({
    species: 'CALCULATING...',
    setup: '...',
    location: '...'
  });

  const regulationsData = [
    { species: "RED DRUM", size: "18\" - 27\" SLOT", bag: "1 PER DAY", notes: "NO GIGGING" },
    { species: "FLOUNDER", size: "15\" MIN", bag: "1 PER DAY", notes: "SEASONAL CLOSURES APPLY" },
    { species: "SPECKLED TROUT", size: "14\" MIN", bag: "4 PER DAY", notes: "ONLY 2 OVER 24\"" },
    { species: "SPANISH MACKEREL", size: "12\" MIN", bag: "15 PER DAY", notes: "MEASURE FORK LENGTH" },
    { species: "WHITING", size: "NO LIMIT", bag: "NO LIMIT", notes: "NO RESTRICTIONS" },
    { species: "BLUEFISH", size: "NO LIMIT", bag: "3 PER DAY", notes: "RECREATIONAL LIMIT" }
  ];

  const rigsGuideData = [
    {
      name: "CAROLINA RIG",
      target: "RED DRUM / HEAVY SURF",
      image: "/carolina.png",
      parts: [
        { num: "1", label: "MAIN LINE", spec: "10-20 LB" },
        { num: "2", label: "BULLET WEIGHT", spec: "1/4-1 OZ" },
        { num: "3", label: "BEAD", spec: "OPTIONAL" },
        { num: "4", label: "SWIVEL", spec: "SIZE 7-10" },
        { num: "5", label: "LEADER LINE + HOOK", spec: "2-4 FT / 8-15 LB OFFSET WORM HOOK" }
      ],
      howItWorks: "THE WEIGHT (2) SLIDES ON THE MAIN LINE AND RESTS ON THE BOTTOM. THE SWIVEL (4) KEEPS YOUR LEADER OFF THE BOTTOM, PRESENTING THE BAIT (5) NATURALLY. GREAT FOR COVERING WATER AND FINDING FISH."
    },
    {
      name: "DOUBLE DROP RIG",
      target: "WHITING / SPOT / BOTTOM FEEDERS",
      image: "/dbldrp.png",
      parts: [
        { num: "1", label: "MAIN LINE", spec: "10-20 LB" },
        { num: "2", label: "SWIVEL", spec: "SIZE 7-10" },
        { num: "3", label: "DROPPER LINE (TOP)", spec: "6-12 IN / 8-12 LB + HOOK" },
        { num: "4", label: "DROPPER LINE (BOTTOM)", spec: "12-24 IN / 8-12 LB + HOOK" }
      ],
      howItWorks: "TWO BAITS, ONE RIG. THE TOP DROPPER (3) STAYS ABOVE THE BOTTOM WHILE THE BOTTOM DROPPER (4) GETS DOWN WHERE FISH OFTEN FEED. GREAT FOR INCREASING YOUR CHANCES IN ONE CAST."
    },
    {
      name: "JIG & SOFT PLASTIC",
      target: "FLOUNDER / BACKWATERS",
      image: "/sftplstc.png",
      parts: [
        { num: "1", label: "MAIN LINE", spec: "10-20 LB" },
        { num: "2", label: "JIG HEAD", spec: "1/8-3/8 OZ" },
        { num: "3", label: "SOFT PLASTIC BAIT", spec: "MATCH THE HATCH" }
      ],
      howItWorks: "THE JIG HEAD (2) ADDS WEIGHT AND ACTION. THE SOFT PLASTIC (3) PROVIDES REALISTIC MOVEMENT TO ATTRACT FISH. PERFECT FOR A VARIETY OF RETRIEVES AND CONDITIONS."
    }
  ];

  // 1. LIVE DATA ENGINE (NOAA + OPEN-METEO WITH HILO TIDE TIMES)
  useEffect(() => {
    async function fetchLiveData() {
      setIsSyncing(true);
      try {
        const stationId = '8659182'; // Yaupon Beach / OKI
        
        const levelResponse = await fetch(`https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=recent&station=${stationId}&product=predictions&datum=MLLW&time_zone=lst_ldt&units=english&format=json`);
        const levelData = await levelResponse.json();
        
        if (levelData && levelData.predictions && levelData.predictions.length > 0) {
          const latestPrediction = levelData.predictions[levelData.predictions.length - 1];
          const rawLevel = parseFloat(latestPrediction.v);
          setTideLevel(rawLevel > 0 ? `+${rawLevel.toFixed(1)} FT` : `${rawLevel.toFixed(1)} FT`);
        }

        const hiloResponse = await fetch(`https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=today&station=${stationId}&product=predictions&datum=MLLW&time_zone=lst_ldt&interval=hilo&units=english&format=json`);
        const hiloData = await hiloResponse.json();

        if (hiloData && hiloData.predictions) {
          const now = new Date();
          const nextTide = hiloData.predictions.find(prediction => {
            const tideTime = new Date(prediction.t.replace(' ', 'T'));
            return tideTime > now;
          });

          if (nextTide) {
            setTideDirection(nextTide.type === 'H' ? 'INCOMING' : 'OUTGOING');
            
            const [datePart, timePart] = nextTide.t.split(' ');
            const [hoursStr, minutesStr] = timePart.split(':');
            let hours = parseInt(hoursStr, 10);
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            const formattedTime = `${hours}:${minutesStr} ${ampm}`;
            const tideTypeStr = nextTide.type === 'H' ? 'HIGH' : 'LOW';

            setNextTideInfo(`NEXT ${tideTypeStr} AT ${formattedTime}`);
          } else {
             setTideDirection('SLACK');
             setNextTideInfo('NEXT TIDE: --');
          }
        }

        const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=33.9166&longitude=-78.1611&current=temperature_2m,wind_speed_10m,wind_direction_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`);
        const weatherData = await weatherResponse.json();

        if (weatherData && weatherData.current) {
          const windSpeed = Math.round(weatherData.current.wind_speed_10m);
          const windDir = getWindDirection(weatherData.current.wind_direction_10m);
          const temp = Math.round(weatherData.current.temperature_2m);
          
          setWindData(`${windDir} ${windSpeed}MPH`);
          setWaterTemp(`${temp}°F`);
        }
      } catch (error) {
        console.error("Data Sync Error:", error);
        setTideDirection('OFFLINE');
        setTideLevel('ERR');
        setNextTideInfo('SYNC ERROR');
        setWindData('ERR');
        setWaterTemp('ERR');
      } finally {
        setIsSyncing(false);
      }
    }

    fetchLiveData();
    const interval = setInterval(fetchLiveData, 6 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. UNIFIED BIOME MATRIX (SPECIES + CONDITIONS SYNCHRONIZED)
  useEffect(() => {
    if (tideDirection === 'SYNCING...' || tideDirection === 'OFFLINE') return;

    const temp = parseInt(waterTemp) || 75;
    const windParts = windData.split(' ');
    const windDir = windParts[0] || 'NE';
    const windSpeed = parseInt(windParts[1]) || 10;
    const currentHour = new Date().getHours();

    const speciesProfiles = [
      {
        name: "RED DRUM",
        minTemp: 60,
        idealTide: "INCOMING",
        bestHours: [18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7],
        setup: "CAROLINA RIG + CUT MULLET",
        baseScore: 0
      },
      {
        name: "SPANISH",
        minTemp: 68,
        idealTide: "INCOMING",
        bestHours: [6, 7, 8, 9, 16, 17, 18, 19],
        setup: "CASTING SPOON / GOTCHA PLUG",
        baseScore: 0
      },
      {
        name: "WHITING",
        minTemp: 55,
        idealTide: "OUTGOING", 
        bestHours: [8, 9, 10, 11, 12, 13, 14, 15],
        setup: "DOUBLE DROP RIG + FISH BITES",
        baseScore: 0
      },
      {
        name: "FLOUNDER",
        minTemp: 62,
        idealTide: "OUTGOING",
        bestHours: [6, 7, 17, 18],
        setup: "GULP MULLET + 1/2 OZ JIG",
        baseScore: 0
      }
    ];

    let topScore = -1;
    let topSpecies = speciesProfiles[0];

    speciesProfiles.forEach(target => {
      let score = target.baseScore;
      if (temp >= target.minTemp) score += 5;
      else score -= 10; 
      if (tideDirection === target.idealTide) score += 10;
      if (target.bestHours.includes(currentHour)) score += 8;
      if (score > topScore) {
        topScore = score;
        topSpecies = target;
      }
    });

    let calculatedLocation = "ZONE C ∶∶ MID-ISLAND SURF"; 

    if (windSpeed > 20) {
      calculatedLocation = "ZONE D ∶∶ DAVIS CANAL";
    }
    else if (topSpecies.name === "SPANISH") {
      calculatedLocation = "ZONE B ∶∶ OCEAN CREST PIER";
    }
    else if (topSpecies.name === "FLOUNDER" && tideDirection === "OUTGOING") {
      calculatedLocation = "ZONE D ∶∶ DAVIS CANAL";
    }
    else if (topSpecies.name === "RED DRUM" && (windDir === 'E' || windDir === 'NE')) {
      calculatedLocation = "ZONE A ∶∶ THE POINT";
    }
    else if (topSpecies.name === "WHITING") {
      calculatedLocation = "ZONE C ∶∶ MID-ISLAND SURF";
    }

    if (topSpecies.name === "RED DRUM" && tideDirection === "INCOMING" && windDir === "NE" && temp > 68) {
      calculatedLocation = "CLASSIFIED ∶∶ ZONE X";
    }

    setMatrixRecommendation({
      species: topSpecies.name,
      setup: topSpecies.setup,
      location: calculatedLocation
    });

  }, [tideDirection, windData, waterTemp]);

  // ---------------------------------------------------------
  // SCREEN 5: RIGS GUIDE
  // ---------------------------------------------------------
  if (activeScreen === 'rigs') {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-white text-black border-x-4 border-black flex flex-col font-sans uppercase selection:bg-black selection:text-white">
        <div className="border-b-4 border-black p-4 flex justify-between items-center bg-black text-white sticky top-0 z-10">
          <button onClick={() => setActiveScreen('dashboard')} className="font-bold text-sm tracking-widest hover:text-gray-300 active:scale-[0.95]">
            &lt; BACK
          </button>
          <h1 className="text-xl font-black tracking-tighter">HOW-TO RIGS</h1>
          <div className="w-16"></div>
        </div>

        <div className="flex-grow overflow-y-auto bg-gray-100">
          {rigsGuideData.map((rig, index) => (
            <div key={index} className="p-6 border-b-4 border-black bg-white">
              <div className="flex items-center space-x-3 mb-2">
                <span className="bg-black text-white font-mono font-black text-lg px-2.5 py-0.5">{index + 1}</span>
                <h2 className="text-2xl font-black tracking-tighter">{rig.name}</h2>
              </div>
              <div className="inline-block bg-black text-white text-[10px] font-mono font-bold px-2.5 py-1 mb-4">
                {rig.target}
              </div>

              {/* RIG REFERENCE IMAGE */}
              <div className="border-2 border-black bg-black mb-4 overflow-hidden">
                <img src={rig.image} alt={rig.name} className="w-full h-auto object-contain grayscale contrast-125" />
              </div>
              
              {/* PARTS TABLE */}
              <div className="border-2 border-black mb-4">
                <div className="bg-black text-white px-3 py-1 text-xs font-bold tracking-widest">PARTS</div>
                <div className="divide-y divide-black bg-white">
                  {rig.parts.map((part, pIdx) => (
                    <div key={pIdx} className="flex justify-between items-center px-3 py-1.5 text-xs font-mono">
                      <div className="flex items-center space-x-2">
                        <span className="w-4 h-4 bg-black text-white rounded-full flex items-center justify-center text-[10px] font-bold">{part.num}</span>
                        <span className="font-bold">{part.label}</span>
                      </div>
                      <span className="text-gray-600 font-semibold">{part.spec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* HOW IT WORKS */}
              <div className="bg-gray-100 p-4 border-2 border-black">
                <span className="text-xs font-bold tracking-widest text-black block mb-2 underline">HOW IT WORKS</span>
                <p className="font-mono text-xs leading-relaxed text-black">
                  {rig.howItWorks}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // SCREEN 4: GOOGLE MAP (HIGH CONTRAST SATELLITE)
  // ---------------------------------------------------------
  if (activeScreen === 'map') {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-white text-black border-x-4 border-black flex flex-col font-sans uppercase selection:bg-black selection:text-white">
        <div className="border-b-4 border-black p-4 flex justify-between items-center bg-black text-white sticky top-0 z-20 shadow-md">
          <button onClick={() => setActiveScreen('dashboard')} className="font-bold text-sm tracking-widest hover:text-gray-300 active:scale-[0.95]">
            &lt; BACK
          </button>
          <h1 className="text-xl font-black tracking-tighter">LIVE SATELLITE</h1>
          <div className="w-16"></div>
        </div>

        <div className="flex-grow flex flex-col relative bg-gray-100">
          <div className="flex-grow w-full relative bg-black overflow-hidden">
            <iframe 
              title="Oak Island Tactical Map"
              src="https://maps.google.com/maps?q=Oak+Island,+NC&t=k&z=12&ie=UTF8&iwloc=&output=embed" 
              className="absolute inset-0 w-full h-full grayscale contrast-[1.25] opacity-80"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
            <div className="absolute inset-0 border-b-4 border-black pointer-events-none z-10"></div>
          </div>

          <div className="bg-white p-6 z-20 border-t-4 border-black">
            <h2 className="text-sm font-bold tracking-widest text-gray-500 mb-4">OKI TACTICAL ZONES</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b-2 border-black pb-2">
                <span className="font-bold text-sm">ZONE A <span className="relative -top-0.5 mx-1 tracking-widest">::</span> THE POINT</span>
                <span className="font-mono text-xs">WEST END / INLET</span>
              </div>
              <div className="flex items-center justify-between border-b-2 border-black pb-2">
                <span className="font-bold text-sm">ZONE B <span className="relative -top-0.5 mx-1 tracking-widest">::</span> OCEAN CREST PIER</span>
                <span className="font-mono text-xs">14TH ST E / PELAGICS</span>
              </div>
              <div className="flex items-center justify-between border-b-2 border-black pb-2">
                <span className="font-bold text-sm">ZONE C <span className="relative -top-0.5 mx-1 tracking-widest">::</span> MID-ISLAND SURF</span>
                <span className="font-mono text-xs">46TH ST E / TROUGH</span>
              </div>
              <div className="flex items-center justify-between border-b-2 border-black pb-2">
                <span className="font-bold text-sm">ZONE D <span className="relative -top-0.5 mx-1 tracking-widest">::</span> DAVIS CANAL</span>
                <span className="font-mono text-xs">SE 40TH ST / MARSH</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // SCREEN 3: REGULATIONS
  // ---------------------------------------------------------
  if (activeScreen === 'regulations') {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-white text-black border-x-4 border-black flex flex-col font-sans uppercase selection:bg-black selection:text-white">
        <div className="border-b-4 border-black p-4 flex justify-between items-center bg-black text-white sticky top-0 z-10">
          <button onClick={() => setActiveScreen('dashboard')} className="font-bold text-sm tracking-widest hover:text-gray-300 active:scale-[0.95]">
            &lt; BACK
          </button>
          <h1 className="text-xl font-black tracking-tighter">NC LIMITS</h1>
          <div className="w-16"></div>
        </div>

        <div className="flex-grow overflow-y-auto bg-gray-100">
          {regulationsData.map((fish, index) => (
            <div key={index} className="p-6 border-b-4 border-black bg-white">
              <h2 className="text-3xl font-black tracking-tighter mb-4">{fish.species}</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex flex-col">
                  <span className="text-gray-500 text-xs font-sans font-bold mb-1">SIZE</span>
                  <span className="font-mono text-xl font-black">{fish.size}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500 text-xs font-sans font-bold mb-1">BAG LIMIT</span>
                  <span className="font-mono text-xl font-black">{fish.bag}</span>
                </div>
              </div>
              <div className="bg-gray-100 p-3 border-2 border-black">
                <span className="text-xs font-bold font-mono">NOTE: {fish.notes}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // SCREEN 1: THE LOG CATCH FORM
  // ---------------------------------------------------------
  if (activeScreen === 'logCatch') {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-white text-black border-x-4 border-black flex flex-col font-sans uppercase selection:bg-black selection:text-white">
        <div className="border-b-4 border-black p-4 flex justify-between items-center bg-black text-white sticky top-0 z-10">
          <button onClick={() => setActiveScreen('dashboard')} className="font-bold text-sm tracking-widest hover:text-gray-300 active:scale-[0.95]">
            &lt; CANCEL
          </button>
          <h1 className="text-xl font-black tracking-tighter">LOG CATCH</h1>
          <div className="w-16"></div>
        </div>

        <div className="flex-grow overflow-y-auto">
          <div className="p-6 border-b-4 border-black bg-white">
            <h2 className="text-sm font-bold tracking-widest text-gray-500 mb-4">SPECIES</h2>
            <div className="grid grid-cols-2 gap-4">
              {speciesList.map(species => (
                <button key={species} onClick={() => setSelectedSpecies(species)} className={`py-4 border-4 border-black font-black text-sm transition-colors active:scale-[0.98] ${selectedSpecies === species ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}>
                  {species}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 border-b-4 border-black bg-gray-100 flex flex-col items-center">
            <h2 className="text-sm font-bold tracking-widest text-gray-500 mb-4 w-full text-left">LENGTH (INCHES)</h2>
            <div className="flex items-center justify-between w-full">
              <button onClick={() => setLength(l => l - 1)} className="w-16 h-16 border-4 border-black bg-white text-4xl font-black flex items-center justify-center active:bg-black active:text-white transition-colors">-</button>
              <div className="text-7xl font-black font-mono tracking-tighter">{length}"</div>
              <button onClick={() => setLength(l => l + 1)} className="w-16 h-16 border-4 border-black bg-white text-4xl font-black flex items-center justify-center active:bg-black active:text-white transition-colors">+</button>
            </div>
          </div>

          <div className="p-6 border-b-4 border-black bg-white">
            <h2 className="text-sm font-bold tracking-widest text-gray-500 mb-4">BAIT / GEAR</h2>
            <div className="grid grid-cols-4 gap-2">
              {baitList.map(bait => (
                <button key={bait} onClick={() => setSelectedBait(bait)} className={`py-3 border-4 border-black font-black text-xs transition-colors active:scale-[0.98] ${selectedBait === bait ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}>
                  {bait}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 bg-white sticky bottom-0 border-t-4 border-black">
          <button onClick={() => setActiveScreen('dashboard')} className="w-full bg-black text-white font-black text-3xl py-6 border-4 border-black hover:bg-white hover:text-black transition-colors active:scale-[0.98]">
            SAVE TO LOG
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // SCREEN 2: THE DASHBOARD
  // ---------------------------------------------------------
  return (
    <div className="max-w-md mx-auto min-h-screen bg-white text-black border-x-4 border-black flex flex-col font-sans uppercase selection:bg-black selection:text-white">
      
      <div className="border-b-4 border-black p-4 flex justify-between items-center bg-black text-white">
        <h1 className="text-2xl font-black tracking-tighter">
          BND <span className="relative -top-0.5 mx-1 tracking-widest">::</span> OKI FISHING
        </h1>
        <span className="font-mono text-sm font-bold">V.1.0_MVP</span>
      </div>

      <div className="p-6 border-b-4 border-black flex flex-col items-center justify-center bg-white relative">
        {isSyncing && <div className="absolute top-4 right-4 w-3 h-3 bg-black rounded-full animate-ping"></div>}
        
        <h2 className="text-sm font-bold tracking-widest text-gray-500 mb-2">LIVE TIDE STATE</h2>
        <div className={`text-6xl font-black tracking-tighter mb-2 ${isSyncing ? 'animate-pulse text-gray-400' : ''}`}>
          {tideDirection}
        </div>
        <div className="font-mono text-xl border-4 border-black px-4 py-1 bg-white font-bold mb-3">
          {tideLevel}
        </div>
        <div className="font-mono text-xs font-bold tracking-widest bg-black text-white px-3 py-1">
          {nextTideInfo}
        </div>
      </div>

      <div className="grid grid-cols-2 border-b-4 border-black bg-white">
        <div className="p-4 border-r-4 border-black flex flex-col items-center">
          <span className="text-xs font-bold text-gray-500 mb-1 font-sans">WIND</span>
          <span className={`font-mono text-2xl font-black ${windData.includes('--') ? 'text-gray-300' : 'text-black'}`}>
            {windData}
          </span>
        </div>
        <div className="p-4 flex flex-col items-center">
          <span className="text-xs font-bold text-gray-500 mb-1 font-sans">WATER</span>
          <span className={`font-mono text-2xl font-black ${waterTemp.includes('--') ? 'text-gray-300' : 'text-black'}`}>
            {waterTemp}
          </span>
        </div>
      </div>

      <div className="p-6 border-b-4 border-black bg-gray-100 transition-all duration-500">
        <h2 className="text-sm font-bold tracking-widest text-gray-500 mb-4">MATRIX RECOMMENDATION</h2>
        <div className={`text-5xl font-black tracking-tighter mb-6 leading-none ${matrixRecommendation.species === 'CALCULATING...' ? 'animate-pulse' : ''}`}>
          {matrixRecommendation.species}
        </div>
        
        <div className="space-y-5 font-mono text-sm">
          <div className="flex flex-col">
            <span className="text-gray-500 text-xs font-sans font-bold mb-1">LOCATION</span>
            <span className="border-b-4 border-black pb-2 text-xl font-black">{matrixRecommendation.location}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500 text-xs font-sans font-bold mb-1">SETUP</span>
            <span 
              onClick={() => setActiveScreen('rigs')} 
              className="border-b-4 border-black pb-2 text-xl font-black cursor-pointer hover:bg-black hover:text-white transition-colors"
              title="Click to view rig instructions"
            >
              {matrixRecommendation.setup}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 flex-grow flex flex-col justify-end space-y-4 bg-white">
        <button 
          onClick={() => setActiveScreen('logCatch')}
          className="w-full bg-black text-white font-black text-3xl py-6 border-4 border-black hover:bg-white hover:text-black transition-colors active:scale-[0.98]"
        >
          LOG CATCH
        </button>
        <div className="grid grid-cols-3 gap-2">
          <button 
            onClick={() => setActiveScreen('rigs')}
            className="w-full bg-white text-black font-black text-xs py-4 border-4 border-black hover:bg-black hover:text-white transition-colors active:scale-[0.98]"
          >
            HOW-TO RIGS
          </button>
          <button 
            onClick={() => setActiveScreen('regulations')}
            className="w-full bg-white text-black font-black text-xs py-4 border-4 border-black hover:bg-black hover:text-white transition-colors active:scale-[0.98]"
          >
            REGULATIONS
          </button>
          <button 
            onClick={() => setActiveScreen('map')}
            className="w-full bg-white text-black font-black text-xs py-4 border-4 border-black hover:bg-black hover:text-white transition-colors active:scale-[0.98]"
          >
            VIEW MAP
          </button>
        </div>
      </div>

    </div>
  );
}
import { useState, useEffect, FC } from "react";
import { ArrowDown, Sparkles } from "lucide-react";
import { Prize, fetchPrizeData } from "../../utils/fetchPrizes";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push } from "firebase/database";
import { firebaseConfig } from "../../firebaseConfig";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  Slider,
} from "@mui/material";
import { GOOGLE_API_KEY, GOOGLE_SHEET_ID } from "../../static-data/constants";
import Confetti from "react-confetti";
import { useNavigate } from "react-router-dom";

const firebase = initializeApp(firebaseConfig);
const database = getDatabase(firebase);

interface FortuneWheelProps {
  onSpinComplete?: (prize: Prize) => void;
}

const FortuneWheel: FC<FortuneWheelProps> = ({ onSpinComplete }) => {
  const [rotation, setRotation] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [showUsernameDialog, setShowUsernameDialog] = useState<boolean>(true);
  const [winningPrize, setWinningPrize] = useState<Prize | null>(null);
  const [showWinDialog, setShowWinDialog] = useState<boolean>(false);
  const [sliderValue, setSliderValue] = useState<number>(0);
  const [isSliding, setIsSliding] = useState<boolean>(false);
  const navigate = useNavigate();

  // Disable scrolling when component mounts
  useEffect(() => {
    // Prevent scrolling on mount
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    // Re-enable scrolling on unmount
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const loadPrizes = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const { prizes: fetchedPrizes } = await fetchPrizeData(
          GOOGLE_SHEET_ID,
          GOOGLE_API_KEY,
        );
        setPrizes(fetchedPrizes);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to load prizes",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadPrizes();
  }, []);

  const selectPrizeByChance = (prizes: Prize[]): Prize => {
    const random = Math.random() * 100;
    let sum = 0;

    for (const prize of prizes) {
      sum += prize.chance || 0;
      if (random <= sum) {
        return prize;
      }
    }

    return prizes[prizes.length - 1];
  };

  const savePrizeToFirebase = async (prize: Prize) => {
    try {
      const prizeRef = ref(database, "prizes");
      await push(prizeRef, {
        username,
        prize: prize.text,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Error saving prize:", error);
    }
  };

  console.log(prizes);

  const handleUsernameSubmit = () => {
    if (username.trim()) {
      setShowUsernameDialog(false);
    }
  };

  const handleGoBack = async () => {
    navigate("/");
  };

  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    console.log(event);
    setSliderValue(newValue as number);
    setIsSliding(true);
  };

  const handleSliderRelease = () => {
    if (sliderValue >= 90) {
      spinWheel();
    } else {
      setSliderValue(0);
      setRotation((prev) => prev - 10);
      setTimeout(() => setRotation((prev) => prev + 10), 100);
    }
    setIsSliding(false);
  };

  const spinWheel = () => {
    if (isSpinning || isLoading || error || prizes.length === 0) return;

    setIsSpinning(true);

    const selectedPrize = selectPrizeByChance(prizes);
    const prizeIndex = prizes.findIndex((p) => p === selectedPrize);
    const spins = 5;
    const sectionSize = 360 / prizes.length;
    const targetRotation = 360 - (prizeIndex * sectionSize + sectionSize / 2);
    const totalDegrees = spins * 360 + targetRotation;

    setRotation((prev) => prev + totalDegrees);

    setTimeout(() => {
      setWinningPrize(selectedPrize);
      setShowWinDialog(true);
      savePrizeToFirebase(selectedPrize);
      onSpinComplete?.(selectedPrize);
      setIsSpinning(false);
      setSliderValue(0);
    }, 5000);
  };

  const getWheelSections = () => {
    if (prizes.length === 0) return null;

    const sectionAngle = 360 / prizes.length;
    return prizes.map((prize, index) => {
      const startAngle = index * sectionAngle;
      const endAngle = (index + 1) * sectionAngle;
      const startRad = ((startAngle - 90) * Math.PI) / 180;
      const endRad = ((endAngle - 90) * Math.PI) / 180;
      const r = 150;

      const x1 = r * Math.cos(startRad);
      const y1 = r * Math.sin(startRad);
      const x2 = r * Math.cos(endRad);
      const y2 = r * Math.sin(endRad);

      const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
      const path = `M 0 0 L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

      const textAngle = (startAngle + endAngle) / 2;
      const textRad = ((textAngle - 90) * Math.PI) / 180;
      const textX = r * 0.65 * Math.cos(textRad);
      const textY = r * 0.65 * Math.sin(textRad);

      return (
        <g key={index}>
          <path
            d={path}
            fill={prize.color}
            stroke="white"
            strokeWidth="2"
            className="drop-shadow-lg"
          />
          <text
            x={textX}
            y={textY}
            fill="white"
            fontSize="11"
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`}
            className="text-shadow"
          >
            {prize.text}
          </text>
        </g>
      );
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold text-gray-600 animate-pulse">
          Loading prizes...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-blue-100 to-purple-100">
      <Dialog
        open={showUsernameDialog}
        onClose={() => setShowUsernameDialog(false)}
      >
        <DialogContent>
          <DialogTitle>Введіть ваше прізвище</DialogTitle>
          <div className="space-y-4">
            <TextField
              placeholder="Прізвище"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleUsernameSubmit()}
              fullWidth
              sx={{ marginBottom: 3 }}
            />
            <Button
              onClick={handleUsernameSubmit}
              disabled={!username.trim()}
              variant="contained"
              fullWidth
              sx={{ marginBottom: 2 }}
            >
              Крутити колесо фортуни
            </Button>
            <Button onClick={handleGoBack} variant="outlined" fullWidth>
              Назад
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showWinDialog}
        onClose={() => {
          navigate("/");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-yellow-400" />
            Вітання, {username}!
          </DialogTitle>
          <div className="space-y-4 text-center">
            <p className="text-2xl font-bold text-primary animate-pulse">
              Ви виграли: {winningPrize?.text}
            </p>
            <div className="py-4">
              <Sparkles className="w-16 h-24 mx-auto text-yellow-400 animate-bounce" />
            </div>
            <Button onClick={() => navigate("/")} variant="contained" fullWidth>
              Close
            </Button>
          </div>
        </DialogContent>
        <Confetti />
      </Dialog>

      <div className="flex flex-col items-center justify-center w-full h-full gap-8 px-4">
        {/* Wheel container - optimized for tablets */}
        <div className="relative w-full max-w-2xl aspect-square">
          <div className="absolute top-0 z-10 -translate-x-1/2 -translate-y-1/2 left-1/2">
            <div className="p-4 bg-white rounded-full shadow-lg">
              <ArrowDown size={40} className="text-gray-800" />
            </div>
          </div>

          <svg
            viewBox="-160 -160 320 320"
            className="w-full h-full drop-shadow-xl"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning
                ? "transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)"
                : isSliding
                  ? "transform 0.1s ease-out"
                  : "none",
            }}
          >
            {getWheelSections()}
          </svg>
        </div>

        {/* Slider controls */}
        <div className="w-full max-w-md px-4">
          <Slider
            value={sliderValue}
            onChange={handleSliderChange}
            onChangeCommitted={handleSliderRelease}
            aria-labelledby="slider"
            min={0}
            max={100}
            sx={{
              color: "#3f51b5",
              height: 10,
              "& .MuiSlider-thumb": {
                width: 32,
                height: 32,
                backgroundColor: "#fff",
                border: "2px solid currentColor",
              },
            }}
          />
          <div className="mt-3 text-base font-medium text-center text-gray-700">
            Тягніть щоб крутити
          </div>
        </div>
      </div>
    </div>
  );
};

export default FortuneWheel;

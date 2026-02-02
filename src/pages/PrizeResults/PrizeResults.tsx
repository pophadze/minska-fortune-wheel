import { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, update } from "firebase/database";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Pagination,
  Box,
  Typography,
  Container,
  Paper,
  Checkbox,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from "@mui/material";
import { firebaseConfig } from "../../firebaseConfig";

const firebase = initializeApp(firebaseConfig);
const database = getDatabase(firebase);

interface PrizeResult {
  id?: string;
  username: string;
  prize: string;
  timestamp: number;
  isGivenOut?: boolean;
}

const PrizeResults = () => {
  const [results, setResults] = useState<PrizeResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [usernameFilter, setUsernameFilter] = useState("");
  const [prizeFilter, setPrizeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isPasswordIncorrect, setIsPasswordIncorrect] = useState(false);
  const rowsPerPage = 10;

  useEffect(() => {
    const prizeRef = ref(database, "prizes");

    const unsubscribe = onValue(prizeRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const resultsArray = Object.entries(data).map(([id, value]) => ({
          id,
          ...(value as Omit<PrizeResult, "id">),
        }));
        setResults(resultsArray.sort((a, b) => b.timestamp - a.timestamp));
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredResults = results.filter(
    (result) =>
      result.username.toLowerCase().includes(usernameFilter.toLowerCase()) &&
      result.prize.toLowerCase().includes(prizeFilter.toLowerCase()),
  );

  const paginatedResults = filteredResults.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage,
  );

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleCheckboxChange = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((selectedId) => selectedId !== id)
        : [...prev, id],
    );
  };

  const handleOpenDialog = () => {
    if (selectedIds.length === 0) return;
    setIsDialogOpen(true);
    setPassword("");
    setIsPasswordIncorrect(false);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setPassword("");
    setIsPasswordIncorrect(false);
  };

  const handleConfirm = async () => {
    if (password !== "4444") {
      setIsPasswordIncorrect(true);
      return;
    }

    try {
      const updates: { [key: string]: boolean } = {};
      selectedIds.forEach((id) => {
        updates[`prizes/${id}/isGivenOut`] = true;
      });

      await update(ref(database), updates);

      setSelectedIds([]);
      handleCloseDialog();
    } catch (error) {
      console.error("Error updating prizes:", error);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleConfirm();
    }
  };

  if (isLoading) {
    return (
      <Box className="flex items-center justify-center min-h-screen">
        <Typography variant="h6" className="animate-pulse">
          Завантаження результатів...
        </Typography>
      </Box>
    );
  }

  return (
    <Container className="min-h-screen py-8">
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
      >
        <Typography variant="h3">Переможці</Typography>
        {selectedIds.length > 0 && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenDialog}
          >
            Відмітити як видані ({selectedIds.length})
          </Button>
        )}
      </Box>

      <Paper elevation={3} className="p-6">
        <Box display="flex" gap={2} mb={4}>
          <TextField
            label="Фільтрувати по імені"
            variant="outlined"
            fullWidth
            value={usernameFilter}
            onChange={(e) => setUsernameFilter(e.target.value)}
          />
          <TextField
            label="Фільтрувати по призу"
            variant="outlined"
            fullWidth
            value={prizeFilter}
            onChange={(e) => setPrizeFilter(e.target.value)}
          />
        </Box>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Переможець</TableCell>
              <TableCell>Приз</TableCell>
              <TableCell>Дата, час</TableCell>
              <TableCell>Часу з моменту виграшу</TableCell>
              <TableCell padding="checkbox" sx={{ paddingRight: "20px" }}>
                Видано
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedResults.map((result) => (
              <TableRow key={result.id} hover>
                <TableCell>{result.username}</TableCell>
                <TableCell>{result.prize}</TableCell>
                <TableCell>
                  {new Date(result.timestamp).toLocaleString("uk-UA")}
                </TableCell>
                <TableCell>{getTimeSince(result.timestamp)}</TableCell>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={
                      result.isGivenOut || selectedIds.includes(result.id!)
                    }
                    disabled={result.isGivenOut}
                    onChange={() => handleCheckboxChange(result.id!)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredResults.length === 0 && (
          <Typography align="center" className="py-8">
            Пусто
          </Typography>
        )}

        {filteredResults.length > rowsPerPage && (
          <Box display="flex" justifyContent="center" mt={4} pb={4}>
            <Pagination
              count={Math.ceil(filteredResults.length / rowsPerPage)}
              page={page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}
      </Paper>

      <Dialog open={isDialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>Підтвердження видачі призів</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Ви впевнені, що хочете відмітити {selectedIds.length} приз(ів) як
            видані?
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Пароль"
            type="password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          {isPasswordIncorrect && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Невірний пароль
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="secondary">
            Скасувати
          </Button>
          <Button onClick={handleConfirm} color="primary">
            Підтвердити
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

const getTimeSince = (timestamp: number) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval === 1 ? "" : "s"} ago`;
    }
  }

  return "Щойно";
};

export default PrizeResults;

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Verify } from './pages/Verify';
import { Shopping } from './pages/Shopping';
import { Recipes } from './pages/Recipes';
import { RecipeDetail } from './pages/RecipeDetail';
import { RecipeNew } from './pages/RecipeNew';
import { RecipeEdit } from './pages/RecipeEdit';
import { Account } from './pages/Account';
import { AdminUsers } from './pages/AdminUsers';
import { AdminTags } from './pages/AdminTags';
import { AdminSettings } from './pages/AdminSettings';
import { NotFound } from './pages/NotFound';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { SeasonalCalendar } from './pages/SeasonalCalendar';
import { SeasonalCalendarAdmin } from './pages/SeasonalCalendarAdmin';
import { Impostor } from './pages/Impostor';
import { AdminImpostor } from './pages/AdminImpostor';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/rezepte" element={<Recipes />} />
        <Route path="/rezepte/neu" element={<RecipeNew />} />
        <Route path="/rezepte/:id" element={<RecipeDetail />} />
        <Route path="/rezepte/:id/bearbeiten" element={<RecipeEdit />} />
        <Route path="/saisonkalender" element={<SeasonalCalendar />} />
        {/* Alte URL → neue Admin-URL */}
        <Route path="/saisonkalender/admin" element={<Navigate to="/admin/saisonkalender" replace />} />
        <Route path="/einkaufsliste" element={<Shopping />} />
        <Route path="/impostor" element={<Impostor />} />
        <Route path="/account" element={<Account />} />
        <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/tags" element={<AdminTags />} />
        <Route path="/admin/saisonkalender" element={<SeasonalCalendarAdmin />} />
        <Route path="/admin/impostor" element={<AdminImpostor />} />
        <Route path="/admin/einstellungen" element={<AdminSettings />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

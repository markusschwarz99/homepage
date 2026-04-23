import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Verify } from './pages/Verify';
import { Blog } from './pages/Blog';
import { BlogNew } from './pages/BlogNew';
import { BlogPost } from './pages/BlogPost';
import { Shopping } from './pages/Shopping';
import { Recipes } from './pages/Recipes';
import { RecipeDetail } from './pages/RecipeDetail';
import { RecipeNew } from './pages/RecipeNew';
import { RecipeEdit } from './pages/RecipeEdit';
import { Account } from './pages/Account';
import { AdminUsers } from './pages/AdminUsers';
import { AdminTags } from './pages/AdminTags';
import { NotFound } from './pages/NotFound';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/neu" element={<BlogNew />} />
        <Route path="/blog/:id" element={<BlogPost />} />
        <Route path="/rezepte" element={<Recipes />} />
        <Route path="/rezepte/neu" element={<RecipeNew />} />
        <Route path="/rezepte/:id" element={<RecipeDetail />} />
        <Route path="/rezepte/:id/bearbeiten" element={<RecipeEdit />} />
        <Route path="/einkaufsliste" element={<Shopping />} />
        <Route path="/account" element={<Account />} />
        <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/tags" element={<AdminTags />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

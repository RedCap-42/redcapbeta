'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      console.log('Auth: Tentative de connexion avec', email);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Auth: Erreur de connexion:', error.message);
        setError(error.message);
      } else {
        console.log('Auth: Connexion réussie, redirection vers le dashboard');
        setMessage('Bienvenue sur RedCapBeta! Redirection vers le tableau de bord...');
        
        // Redirection vers le dashboard après un court délai
        setTimeout(() => {
          router.replace('/dashboard');
          router.refresh();
        }, 1500);
      }
    } catch (error) {
      console.error('Auth: Erreur inattendue:', error);
      setError('Une erreur inattendue s\'est produite. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    // Vérifier que les mots de passe correspondent
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    // Vérifier la force du mot de passe (minimum 8 caractères)
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      setLoading(false);
      return;
    }

    try {
      console.log('Auth: Tentative d\'inscription avec', email);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        console.error('Auth: Erreur d\'inscription:', error.message);
        setError(error.message);
      } else {
        console.log('Auth: Inscription réussie');
        setMessage('Inscription réussie! Veuillez vérifier votre email pour confirmer votre compte.');
        // Réinitialiser le formulaire
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        // Revenir au mode connexion
        setMode('signin');
      }
    } catch (error) {
      console.error('Auth: Erreur inattendue:', error);
      setError('Une erreur inattendue s\'est produite. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError(null);
    setMessage(null);
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-6 bg-white rounded-lg shadow-md w-full max-w-md">
      <h1 className="text-2xl font-bold text-gray-800">
        {mode === 'signin' ? 'Connexion à RedCapBeta' : 'Inscription à RedCapBeta'}
      </h1>

      {error && (
        <div className="w-full p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {message && (
        <div className="w-full p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {message}
        </div>
      )}
      
      <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="w-full space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {mode === 'signup' && (
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
              Confirmer le mot de passe
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading
            ? (mode === 'signin' ? 'Connexion en cours...' : 'Inscription en cours...')
            : (mode === 'signin' ? 'Se connecter' : 'S\'inscrire')
          }
        </button>

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={toggleMode}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            {mode === 'signin'
              ? 'Pas encore de compte ? Inscrivez-vous'
              : 'Déjà un compte ? Connectez-vous'}
          </button>
        </div>
      </form>
    </div>
  );
}


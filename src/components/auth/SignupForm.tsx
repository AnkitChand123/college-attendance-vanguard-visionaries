import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SignupFormProps {
  onToggleMode: () => void;
}

interface PRNOption {
  prn: string;
  name: string | null;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onToggleMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedPRN, setSelectedPRN] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [prnOptions, setPrnOptions] = useState<PRNOption[]>([]);
  
  const { signUp } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadPRNOptions();
  }, []);

  const loadPRNOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('PRNs')
        .select('PRN, Name')
        .order('PRN');

      if (error) throw error;

      const options = data.map(item => ({
        prn: item.PRN.toString(),
        name: item.Name
      }));
      setPrnOptions(options);
    } catch (error) {
      console.error('Error loading PRN options:', error);
    }
  };

  const handlePRNChange = (selectedPRN: string) => {
    setSelectedPRN(selectedPRN);
    const selected = prnOptions.find(option => option.prn === selectedPRN);
    if (selected && selected.name) {
      setFullName(selected.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (!selectedPRN) {
      setError('Please select your PRN');
      setLoading(false);
      return;
    }

    // Check if PRN is already registered
    try {
      const { data: existingProfile } = await supabase
        .from('student_profiles')
        .select('prn')
        .eq('prn', selectedPRN)
        .single();

      if (existingProfile) {
        setError('This PRN is already registered. Please contact admin if this is an error.');
        setLoading(false);
        return;
      }
    } catch (error) {
      // PRN not found, which is good - we can proceed
    }

    const { error } = await signUp(email, password, selectedPRN, fullName);

    if (error) {
      setError(error.message);
      toast({
        title: "Signup Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Signup Successful",
        description: "Please check your email to verify your account.",
      });
    }

    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Student Registration</CardTitle>
        <CardDescription>
          Create your account to access the attendance system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="prn">PRN *</Label>
            <Select value={selectedPRN} onValueChange={handlePRNChange} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Select your PRN" />
              </SelectTrigger>
              <SelectContent>
                {prnOptions.map((option) => (
                  <SelectItem key={option.prn} value={option.prn}>
                    {option.prn} - {option.name || 'No Name'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>

          <div className="text-center">
            <Button
              type="button"
              variant="link"
              onClick={onToggleMode}
              disabled={loading}
            >
              Already have an account? Sign in
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
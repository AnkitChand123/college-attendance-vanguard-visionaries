-- Enable public read access to PRNs table for student selection
CREATE POLICY "Allow public read access to PRNs" 
ON public."PRNs" 
FOR SELECT 
USING (true);
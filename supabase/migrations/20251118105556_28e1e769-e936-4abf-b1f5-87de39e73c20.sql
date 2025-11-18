-- Create parent_child_link_requests table
CREATE TABLE public.parent_child_link_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.parent_child_link_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for parent_child_link_requests
CREATE POLICY "Parents can view their own requests"
  ON public.parent_child_link_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parents
      WHERE parents.id = parent_child_link_requests.parent_id
      AND parents.user_id = auth.uid()
    )
  );

CREATE POLICY "Students can view requests for them"
  ON public.parent_child_link_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = parent_child_link_requests.student_id
      AND students.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can insert their own requests"
  ON public.parent_child_link_requests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.parents
      WHERE parents.id = parent_child_link_requests.parent_id
      AND parents.user_id = auth.uid()
    )
  );

CREATE POLICY "Students can update requests for them"
  ON public.parent_child_link_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = parent_child_link_requests.student_id
      AND students.user_id = auth.uid()
    )
  );

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_parent_child_link_requests_parent_id ON public.parent_child_link_requests(parent_id);
CREATE INDEX idx_parent_child_link_requests_student_id ON public.parent_child_link_requests(student_id);
CREATE INDEX idx_parent_child_link_requests_status ON public.parent_child_link_requests(status);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);

-- Create trigger for updated_at
CREATE TRIGGER update_parent_child_link_requests_updated_at
  BEFORE UPDATE ON public.parent_child_link_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
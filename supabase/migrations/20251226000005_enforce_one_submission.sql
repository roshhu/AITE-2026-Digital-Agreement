-- Enforce One Submission Per Volunteer
ALTER TABLE submissions ADD CONSTRAINT unique_volunteer_submission UNIQUE (volunteer_id);

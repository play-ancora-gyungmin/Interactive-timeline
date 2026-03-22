-- Drop day-level uniqueness so a user can post multiple journal entries per day.
DROP INDEX "journal_entries_user_date_unique";

-- Support feed pagination by latest post time.
CREATE INDEX "journal_entries_user_created_at_idx"
ON "journal_entries"("user_id", "created_at", "id");

-- 1) Ensure requestId column exists (shadow DB will need this)
ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "requestId" uuid;

-- 2) If some earlier DB version has requestId as text, convert to uuid safely
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Notification'
      AND column_name = 'requestId'
      AND data_type IN ('text', 'character varying')
  ) THEN
    -- Drop FK if it exists (type change requires this)
    ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_requestId_fkey";

    -- Null any non-uuid strings before casting (prevents cast failure)
    EXECUTE $q$
      UPDATE "Notification"
      SET "requestId" = NULL
      WHERE "requestId" IS NOT NULL
        AND "requestId" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    $q$;

    -- Convert to uuid
    ALTER TABLE "Notification"
      ALTER COLUMN "requestId" TYPE uuid
      USING "requestId"::uuid;
  END IF;
END $$;

-- 3) Add FK if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Notification_requestId_fkey'
  ) THEN
    ALTER TABLE "Notification"
      ADD CONSTRAINT "Notification_requestId_fkey"
      FOREIGN KEY ("requestId") REFERENCES "FriendRequest"("id")
      ON DELETE SET NULL;
  END IF;
END $$;

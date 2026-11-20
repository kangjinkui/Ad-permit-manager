-- 옥외광고물 검토서 초안과 비공개 첨부파일 저장소

CREATE TABLE IF NOT EXISTS public.permit_reviews (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_record_no text NOT NULL UNIQUE
                     REFERENCES public.permit_records(record_no) ON DELETE CASCADE,
  template_id      text CHECK (template_id IS NULL OR template_id IN (
                     'T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07', 'T08', 'T09'
                   )),
  draft            jsonb NOT NULL DEFAULT '{"fields":{},"checks":{}}'::jsonb
                     CHECK (jsonb_typeof(draft) = 'object'),
  template_version integer NOT NULL DEFAULT 1 CHECK (template_version > 0),
  version          uuid NOT NULL DEFAULT gen_random_uuid(),
  created_by       uuid NOT NULL REFERENCES public.profiles(id),
  updated_by       uuid NOT NULL REFERENCES public.profiles(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.permit_review_attachments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id    uuid NOT NULL REFERENCES public.permit_reviews(id) ON DELETE RESTRICT,
  object_path  text NOT NULL UNIQUE,
  original_name text NOT NULL CHECK (length(trim(original_name)) BETWEEN 1 AND 255),
  content_type text NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes   bigint NOT NULL CHECK (size_bytes BETWEEN 1 AND 5242880),
  state        text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'ready')),
  created_by   uuid NOT NULL REFERENCES public.profiles(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (object_path = review_id::text || '/' || id::text || CASE content_type
    WHEN 'image/jpeg' THEN '.jpg' WHEN 'image/png' THEN '.png' ELSE '.webp' END)
);

CREATE INDEX IF NOT EXISTS permit_review_attachments_review_id_idx
  ON public.permit_review_attachments(review_id, created_at);

DROP TRIGGER IF EXISTS permit_reviews_set_updated_at ON public.permit_reviews;
CREATE TRIGGER permit_reviews_set_updated_at
  BEFORE UPDATE ON public.permit_reviews
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.permit_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permit_review_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "active users can read permit reviews" ON public.permit_reviews;
DROP POLICY IF EXISTS "active users can insert permit reviews" ON public.permit_reviews;
DROP POLICY IF EXISTS "active users can update permit reviews" ON public.permit_reviews;

CREATE POLICY "active users can read permit reviews"
  ON public.permit_reviews FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.permit_records p
      WHERE p.record_no = permit_reviews.permit_record_no
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND status = 'active'
    )
  );

CREATE POLICY "active users can insert permit reviews"
  ON public.permit_reviews FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND updated_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.permit_records p
      WHERE p.record_no = permit_reviews.permit_record_no
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND status = 'active'
    )
  );

CREATE POLICY "active users can update permit reviews"
  ON public.permit_reviews FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.permit_records p
      WHERE p.record_no = permit_reviews.permit_record_no
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND status = 'active'
    )
  )
  WITH CHECK (
    updated_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.permit_records p
      WHERE p.record_no = permit_reviews.permit_record_no
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "active users can read review attachments" ON public.permit_review_attachments;
DROP POLICY IF EXISTS "active users can insert review attachments" ON public.permit_review_attachments;
DROP POLICY IF EXISTS "active users can delete review attachments" ON public.permit_review_attachments;
DROP POLICY IF EXISTS "uploaders can finalize review attachments" ON public.permit_review_attachments;

CREATE POLICY "active users can read review attachments"
  ON public.permit_review_attachments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.permit_reviews r
      JOIN public.permit_records p ON p.record_no = r.permit_record_no
      WHERE r.id = permit_review_attachments.review_id
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND status = 'active'
    )
  );

CREATE POLICY "uploaders can finalize review attachments"
  ON public.permit_review_attachments FOR UPDATE TO authenticated
  USING (
    state = 'pending'
    AND created_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND status = 'active'
    )
  )
  WITH CHECK (
    state = 'ready'
    AND created_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND status = 'active'
    )
  );

CREATE POLICY "active users can insert review attachments"
  ON public.permit_review_attachments FOR INSERT TO authenticated
  WITH CHECK (
    state = 'pending'
    AND created_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.permit_reviews r
      JOIN public.permit_records p ON p.record_no = r.permit_record_no
      WHERE r.id = permit_review_attachments.review_id
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND status = 'active'
    )
  );

CREATE POLICY "active users can delete review attachments"
  ON public.permit_review_attachments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.permit_reviews r
      JOIN public.permit_records p ON p.record_no = r.permit_record_no
      WHERE r.id = permit_review_attachments.review_id
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND status = 'active'
    )
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'permit-review-attachments',
  'permit-review-attachments',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

DROP POLICY IF EXISTS "active users can read review attachment objects" ON storage.objects;
DROP POLICY IF EXISTS "active users can upload review attachment objects" ON storage.objects;
DROP POLICY IF EXISTS "active users can delete review attachment objects" ON storage.objects;

-- Upload and remove operations also read object rows. The uploader can see pending
-- objects, and staff can see abandoned pending rows when cleaning up a permit.
CREATE POLICY "active users can read review attachment objects"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    storage.objects.bucket_id = 'permit-review-attachments'
    AND EXISTS (
      SELECT 1
      FROM public.permit_review_attachments a
      JOIN public.permit_reviews r ON r.id = a.review_id
      JOIN public.permit_records p ON p.record_no = r.permit_record_no
      JOIN public.profiles profile ON profile.id = (SELECT auth.uid())
      WHERE a.object_path = storage.objects.name
        AND (a.state = 'ready' OR a.created_by = (SELECT auth.uid())
             OR a.created_at < now() - interval '15 minutes')
        AND profile.status = 'active'
    )
  );

CREATE POLICY "active users can upload review attachment objects"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    storage.objects.bucket_id = 'permit-review-attachments'
    AND EXISTS (
      SELECT 1
      FROM public.permit_review_attachments a
      JOIN public.permit_reviews r ON r.id = a.review_id
      JOIN public.permit_records p ON p.record_no = r.permit_record_no
      JOIN public.profiles profile ON profile.id = (SELECT auth.uid())
      WHERE a.object_path = storage.objects.name
        AND a.created_by = (SELECT auth.uid())
        AND a.state = 'pending'
        AND profile.status = 'active'
    )
  );

CREATE POLICY "active users can delete review attachment objects"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    storage.objects.bucket_id = 'permit-review-attachments'
    AND EXISTS (
      SELECT 1
      FROM public.permit_review_attachments a
      JOIN public.permit_reviews r ON r.id = a.review_id
      JOIN public.permit_records p ON p.record_no = r.permit_record_no
      JOIN public.profiles profile ON profile.id = (SELECT auth.uid())
      WHERE a.object_path = storage.objects.name AND profile.status = 'active'
    )
  );

-- 허가 삭제 전에 애플리케이션의 cleanupReviewAttachments(record_no)를 호출한다.
-- review -> attachment는 RESTRICT이므로 cleanup과 허가 삭제 사이에 업로드가 경합하면 삭제가 안전하게 실패한다.

-- Remove placeholder seed data inserted by migration 002.
-- These were demo rows that caused stats to show fake topic and donation counts.

DELETE FROM campaigns WHERE slug = 'borehole-mathare-south';

DELETE FROM topics WHERE slug IN (
  'water-nairobi-informal',
  'teacher-shortages-rural',
  'boda-boda-safety'
);

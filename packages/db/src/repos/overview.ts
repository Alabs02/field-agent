import { sql } from "drizzle-orm";
import { OverviewSchema } from "@field-agent/shared";
import type { Database } from "../client.js";

export async function overview(db: Database, portalId: string, from: Date, to: Date) {
  const [row] = await db.execute(sql`
    with p as (select * from promotions where portal_id=${portalId}),
    b as (select * from brands where portal_id=${portalId}),
    r as (select status,requests_made,queued_at,finished_at from scrape_runs where portal_id=${portalId}
      union all select status,requests_made,queued_at,finished_at from verification_runs where portal_id=${portalId}),
    scope as (select * from r where queued_at >= ${from.toISOString()}::timestamptz and queued_at <= ${to.toISOString()}::timestamptz)
    select json_build_object(
      'generatedAt',now(), 'from',${from.toISOString()}::text, 'to',${to.toISOString()}::text,
      'inventory', (select json_build_object(
        'listed',count(*) filter(where removed_at is null),
        'endingSoon',count(*) filter(where removed_at is null and ends_at >= now() and ends_at <= now()+interval '7 days'),
        'unknownEnd',count(*) filter(where removed_at is null and ends_at is null),
        'needsAttention',count(*) filter(where removed_at is null and last_verification_outcome in ('changed','missing_at_source','unverifiable')),
        'listingChecked',count(*) filter(where removed_at is null and last_verification_coverage='listing'),
        'detailChecked',count(*) filter(where removed_at is null and last_verification_coverage='detail'),
        'unverified',count(*) filter(where removed_at is null and last_verification_coverage is null),
        'brands',(select count(*) from b),
        'brandsFetched',(select count(*) from b where store_page_fetched_at is not null),
        'brandsWithWebsite',(select count(*) from b where website_url is not null),
        'brandsWithHours',(select count(*) from b where hours is not null),
        'brandsWithSocials',(select count(*) from b where jsonb_array_length(social_links)>0)
      ) from p),
      'activity',(select json_build_object(
        'discovered',(select count(*) from p where first_seen_at >= ${from.toISOString()}::timestamptz and first_seen_at <= ${to.toISOString()}::timestamptz),
        'runs',count(*),'requests',coalesce(sum(requests_made),0),
        'failed',count(*) filter(where status in ('failed','stalled','completed_with_errors')),
        'changed',(select count(*) from audit_events where portal_id=${portalId} and action='promotion.updated' and created_at between ${from.toISOString()}::timestamptz and ${to.toISOString()}::timestamptz)
      ) from scope),
      'expirations',coalesce((select json_agg(x) from (select to_char(ends_at at time zone 'America/Denver','YYYY-MM-DD') as day,count(*)::int as count from p where removed_at is null and ends_at >= now() and ends_at < now()+interval '30 days' group by 1 order by 1) x),'[]'::json),
      'brands',coalesce((select json_agg(x) from (select b.name,b.slug,count(p.id)::int as count from b join p on p.brand_id=b.id and p.removed_at is null group by b.id,b.name,b.slug order by count(p.id) desc,b.name,b.id limit 12) x),'[]'::json),
      'outcomes',coalesce((select json_agg(x) from (select to_char(queued_at at time zone 'America/Denver','YYYY-MM-DD') as day,
        count(*) filter(where status='completed')::int as completed,
        count(*) filter(where status='completed_with_errors')::int as partial,
        count(*) filter(where status in ('failed','stalled','cancelled'))::int as failed
        from scope group by 1 order by 1) x),'[]'::json),
      'lastScrapeAt',(select max(finished_at) from scrape_runs where portal_id=${portalId} and status='completed'),
      'lastVerifyAt',(select max(finished_at) from verification_runs where portal_id=${portalId} and status in ('completed','completed_with_errors')),
      'auditStartedAt',(select min(created_at) from audit_events where portal_id=${portalId})
    ) as overview`);
  return OverviewSchema.parse(row?.overview);
}

import type { Metadata } from "next";
import { Check, MessageSquare, Phone } from "@/components/icons";
import { getDictionary, isLocale } from "@/lib/i18n";
import { site, type Locale } from "@/lib/site";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string | string[] }>;
};

async function receiptState({ params, searchParams }: PageProps) {
  const [{ locale: rawLocale }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const successful = query.status === "success";

  return {
    dict: getDictionary(locale),
    successful,
  };
}

export async function generateMetadata(
  props: PageProps,
): Promise<Metadata> {
  const { dict, successful } = await receiptState(props);
  const receipt = dict.requestReceipt;

  return {
    title: successful
      ? receipt.successHeading
      : receipt.failureHeading,
    robots: { index: false, follow: false },
  };
}

export default async function RequestReceiptPage(props: PageProps) {
  const { dict, successful } = await receiptState(props);
  const receipt = dict.requestReceipt;
  const heading = successful
    ? receipt.successHeading
    : receipt.failureHeading;
  const body = successful ? receipt.successBody : receipt.failureBody;
  const StatusIcon = successful ? Check : Phone;

  return (
    <section className="section min-h-[55vh] bg-[var(--color-mint)]">
      <div className="container-tight">
        <div className="card flex flex-col items-center px-6 py-10 text-center sm:px-12 sm:py-14">
          <span
            aria-hidden="true"
            className={`inline-flex h-16 w-16 items-center justify-center rounded-full ${
              successful
                ? "bg-[var(--color-mint-2)] text-[var(--color-teal-ink)]"
                : "bg-[var(--color-amber-soft)] text-[var(--color-ink)]"
            }`}
          >
            <StatusIcon className="h-8 w-8" />
          </span>
          <h1 className="h1 heading-tick heading-tick--center mt-7">
            {heading}
          </h1>
          <p className="lead measure-sm mt-4 text-[var(--color-body)]">
            {body}
          </p>
          <p className="mt-7 font-bold text-[var(--color-ink)]">
            {receipt.contactLine}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <a href={site.phone.href} className="btn btn-navy">
              <Phone className="h-4 w-4" />
              {dict.common.callUs}
            </a>
            <a href={site.textLine.href} className="btn btn-outline">
              <MessageSquare className="h-4 w-4" />
              {dict.common.textUs}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

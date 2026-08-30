/* Shared long-form renderer for blog posts and education topics. Rendered
   here with the practice's real colonoscopy article. */
import { ArticleBody, previewArticleSections, previewLocale } from "westchase-gi";
export function EducationTopic() {
  return <ArticleBody sections={previewArticleSections} locale={previewLocale} />;
}

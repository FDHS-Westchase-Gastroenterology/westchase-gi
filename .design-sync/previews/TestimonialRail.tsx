/* The 11 published patient testimonials, verbatim, on a scroll-snap rail.
   Native touch scrolling; the buttons assist pointer users. */
import { TestimonialRail } from "westchase-gi";
export function Default() {
  return (
    <TestimonialRail
      label="What patients say"
      prevLabel="Previous testimonial"
      nextLabel="Next testimonial"
    />
  );
}

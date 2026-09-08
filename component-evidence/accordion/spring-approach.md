# Accordion spring candidate

This version changes the panel movement while keeping the stock Help content and layout. It is
an experiment for comparison with the stock implementation at
`5e26ae1726b3e9b25c79b6ca0a3548e37ee21f8b`. It does not claim a measured improvement before its
Preview report and Jason's review.

The reusable source is `src/components/stock/accordion.tsx` with `accordion/motion.tsx`. The
registry packages both files; `npm run registry:install:accordion` updates the application copies
under `src/components/ui/`. The application imports that installed Accordion. Motion is already
an application dependency and is declared by the registry for future consumers.

## Behavior decision

Apple Design leads this experiment. The starting hypothesis is a critically damped spring with
response 0.3 seconds and damping ratio 1.0. The adapter translates that hypothesis into a physical
spring: mass 1, angular frequency 2π/0.3, stiffness approximately 438.65, and damping approximately
41.89. This is an explicit web implementation choice, not a claim that Motion and Apple's APIs
produce identical curves. Response is not the measured settling duration.

On pointer activation, the panel retargets its current Motion value and velocity. Text remains at
its natural scale. A ResizeObserver measures the content wrapper so wrapping and content changes
can update the destination height. Keyboard, assistive activation, programmatic disclosure, and
reduced-motion updates set the final height immediately. Initial open content is visible without
an entrance animation.

Base UI retains button activation, controlled/uncontrolled values, multiple-open behavior,
identifiers, region semantics, disabled states, and browser-find disclosure. The adapter owns
animated presence because Base UI's CSS-animation lifecycle cannot observe a JavaScript spring.
Closed answers become unavailable to focus immediately; `hidden="until-found"` answers remain
searchable after closing. The public custom-render and ref interfaces are forwarded.

This first spring hypothesis does not introduce an icon rotation or a new press-scale treatment.
Those would be separate behavior decisions and commits.

## Motion review

| Before | After | Why |
| --- | --- | --- |
| Stock panel uses 200ms height keyframes. | One critically damped spring controls panel height. | Compare a continuous physical response with the stock treatment. |
| A new keyframe animation can restart during reversal. | Retarget the existing value with its current velocity. | Avoid resetting the panel to a fixed endpoint when intent changes mid-movement. |
| Keyboard activation follows the same panel animation. | Keyboard and assistive activation set the final height immediately. | Apply the agreed input distinction. |
| Reduced motion depends on the application's global CSS reset. | The reusable component reads the preference and updates immediately. | Preserve the behavior when the component is installed elsewhere. |
| Trigger uses transition-all. | Only color and focus-shadow transitions remain. | Avoid accidentally animating future layout properties. |

Verdict: source review supports this bounded experiment. The panel-height animation is Jason's
explicitly approved exception to the supplementary GPU-only rule. Performance and visual quality
remain subject to the exact Preview measurements and human review; source review alone cannot
approve them. Physical-phone performance and exhaustive assistive-technology testing are not
established by a desktop browser resized to mobile dimensions.

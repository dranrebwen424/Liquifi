/**
 * The shared admin content margin.
 *
 * Admin home, the approvals queue and the department workspace all use this,
 * so their content left and right edges line up on wide monitors. Desktop
 * only: below `lg` the content area is already narrower than the cap, so
 * capping it would change nothing while risking a cramped layout if the
 * breakpoints ever move.
 *
 * `max-w-6xl` (1152px) is the value that also keeps the home grid's five
 * columns plus four gaps wide enough for a three-line department name.
 */
export const ADMIN_CONTENT = "lg:mx-auto lg:max-w-6xl";

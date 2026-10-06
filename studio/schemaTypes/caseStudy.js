import { defineArrayMember, defineField, defineType } from "sanity";
import { MEDIUMS, LIMITS } from "../../src/shared/submit-constants.mjs";

export const caseStudy = defineType({
  name: "caseStudy",
  title: "Case Study",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required().max(LIMITS.TITLE),
    }),
    defineField({
      name: "authors",
      title: "Author(s)",
      type: "string",
      validation: (Rule) => Rule.max(LIMITS.AUTHORS),
      description: "For a non-paper, add organization/outlet",
    }),
    defineField({
      name: "year",
      title: "Year",
      type: "string",
      validation: (Rule) =>
        Rule.custom((value) => {
          if (!value) return true;
          if (/^\d{4}$/.test(value) && Number(value) >= 1900 && Number(value) <= 2100) return true;
          return "Enter a valid year.";
        }),
    }),
    defineField({
      name: "source",
      title: "Source",
      type: "string",
      validation: (Rule) => Rule.max(LIMITS.SOURCE),
      description: "For a paper, add the publication venue here",
    }),
    defineField({
      name: "medium",
      title: "Type",
      type: "string",
      options: {
        list: MEDIUMS.map((medium) => ({ title: medium, value: medium })),
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "provenance",
      title: "Provenance",
      type: "string",
      options: {
        list: [
          { title: "Ecosystem paper", value: "Ecosystem paper" },
          { title: "Open Submission", value: "Open Submission" },
          {
            title: "Collaborator submission",
            value: "Collaborator submission",
          },
          { title: "Team find", value: "Team find" },
          { title: "Annotated Bibliography", value: "Annotated Bibliography" },
        ],
      },
    }),
    defineField({
      name: "paperCitation",
      title: "Paper citation #",
      type: "number",
      description:
        "Citation number from the ecosystem paper bibliography (internal only)",
      hidden: ({ document }) => document?.provenance !== "Ecosystem paper",
      validation: (Rule) => Rule.integer().positive(),
    }),
    defineField({
      name: "sourceUrl",
      title: "Source URL",
      type: "string",
      validation: (Rule) => Rule.max(LIMITS.URL),
    }),
    defineField({
      name: "submitterContact",
      title: "Submitter contact",
      type: "string",
      description:
        "Optional email of whoever submitted via the site form. Not shown publicly. Omitted when they chose to remain anonymous.",
      hidden: ({ document }) => document?.provenance !== "Open Submission",
      validation: (Rule) =>
        Rule.max(LIMITS.CONTACT).custom((value, context) => {
          const doc = context?.document;
          if (doc?.provenance !== "Open Submission") return true;
          if (doc?.submitterAnonymous) return true;
          const contact = String(value || "").trim();
          if (!contact) return true;
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
            return "Enter a valid email";
          }
          return true;
        }),
    }),
    defineField({
      name: "submitterName",
      title: "Submitter name",
      type: "string",
      validation: (Rule) => Rule.max(LIMITS.SUBMITTER_NAME),
      description:
        "Not shown on the site unless they asked to be listed as a contributor.",
      hidden: ({ document }) => document?.provenance !== "Open Submission",
    }),
    defineField({
      name: "submitterAffiliation",
      title: "Submitter affiliation",
      type: "string",
      validation: (Rule) => Rule.max(LIMITS.SUBMITTER_AFFILIATION),
      description:
        "Not shown on the site unless they asked to be listed as a contributor",
      hidden: ({ document }) => document?.provenance !== "Open Submission",
    }),
    defineField({
      name: "submitterAnonymous",
      title: "Submitter chose to remain anonymous",
      type: "boolean",
      initialValue: false,
      hidden: ({ document }) => document?.provenance !== "Open Submission",
    }),
    defineField({
      name: "listSubmitterPublicly",
      title: "List submitter publicly",
      type: "boolean",
      description:
        "Off unless the submitter asked to be listed as a contributor. The site does not publish this on its own.",
      initialValue: false,
      hidden: ({ document }) => document?.provenance !== "Open Submission",
    }),
    defineField({
      name: "imageUrl",
      title: "Image URL",
      type: "string",
      validation: (Rule) => Rule.max(LIMITS.URL),
    }),
    defineField({
      name: "sensitiveThumbnail",
      title: "Sensitive thumbnail",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "technologies",
      title: "Technologies",
      type: "array",
      validation: (Rule) => Rule.max(LIMITS.TECHNOLOGIES),
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "technology" }],
        }),
      ],
    }),
    defineField({
      name: "headlineSegments",
      title: "Headline segments",
      type: "array",
      validation: (Rule) => Rule.max(LIMITS.HIGHLIGHTS),
      of: [
        defineArrayMember({
          type: "object",
          name: "headlineSegment",
          fields: [
            defineField({
              name: "text",
              title: "Phrase in title",
              type: "string",
              validation: (Rule) => Rule.required().max(LIMITS.HIGHLIGHT_LEN),
            }),
            defineField({
              name: "technology",
              title: "Technology",
              type: "reference",
              to: [{ type: "technology" }],
            }),
          ],
          preview: {
            select: { title: "text", subtitle: "technology.name" },
          },
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "medium",
      year: "year",
      provenance: "provenance",
      contact: "submitterContact",
      anonymous: "submitterAnonymous",
    },
    prepare({ title, subtitle, year, provenance, contact, anonymous }) {
      const bits = [subtitle, year].filter(Boolean);
      if (provenance === "Open Submission") {
        const who = anonymous ? "anonymous" : contact;
        bits.unshift(who ? `Submission · ${who}` : "Submission");
      }
      return {
        title,
        subtitle: bits.join(" · "),
      };
    },
  },
  orderings: [
    {
      title: "Year, newest",
      name: "yearDesc",
      by: [{ field: "year", direction: "desc" }],
    },
  ],
});

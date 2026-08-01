---
title: A delegated brief's breadth becomes delegation depth you cannot unwind
date: 2026-07-31
category: process
module: subagent delegation
problem_type: runaway_cost
severity: high
applies_when:
  - about to spawn a subagent for research rather than a bounded change
  - the brief lists several cases, jurisdictions, or "prefer primary sources"
  - a request said "quick" and the word appears nowhere in the prompt sent
  - a subagent's own children are the thing burning budget
tags: [delegation, subagents, scope, cost, research]
---

## The claim

A subagent fans out in proportion to the breadth of its brief, and only its
direct children can be stopped. Breadth authored into a prompt is therefore a
cost you cannot cancel once it starts.

## What happened

Two agents ran the same day, same model, opposite outcomes.

The one that worked redrew an SVG. Its brief named one file, a byte ceiling,
five hard constraints, and "report what you verified". It returned measurements,
and it refuted its own hypothesis rather than shipping it.

The one that failed answered a request phrased as "task a quick search". The
brief it received listed seven cases, three jurisdictions, "prefer primary or
authoritative sources", and a survey of industry practice. It fanned out to
about a dozen agents. The transcripts show the decision in plain text: *"I'll
fan out parallel research streams and take the Valve piece myself."* Given that
brief, that was the reasonable way to answer it.

The word "quick" was in the request and in none of the prompt.

## Why stopping it did not work

`TaskStop` reached the parent. All eight grandchildren returned "no task found":
only direct children are in the registry. The user killed the rest by hand.

Delegation depth cannot be unwound after the fact, so it has to be forbidden
before it starts.

## What to do instead

State the limit as an instruction, not as an adjective in the request:

    One search. Do not delegate. Five bullets. Stop.

And check the recoverable value before spawning at all. Salvage from 22MB of
killed transcripts was a single useful fragment; the answer that mattered was
three sentences long and was already available before anything was spawned.

## The tell

If the brief contains a numbered list of cases, more than one jurisdiction, or
the phrase "survey", it is not a quick search, whatever the request called it.

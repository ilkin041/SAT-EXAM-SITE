# Feature decisions

## Groups: keep

Groups are the authorization and assignment primitive for private tests. They
remain a supported feature even while production usage is zero, because paid or
institution-assigned tests need this boundary. Phase 5 adds member progress and
group-level score aggregates to the existing membership and assignment UI.

## Annotations: keep and surface

Passage highlighting and notes are a core digital-test study behavior. The zero
row count was treated as a discoverability problem rather than evidence that the
feature has no value. The attempt passage now explains that selected text can be
highlighted or annotated, displays a saved count, and completed-answer review
loads the same persisted annotations.

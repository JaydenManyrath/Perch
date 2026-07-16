# Perch Domain

Perch connects interns with people, housing, and places that help them land in a new city.

## Language

**Intern**:
A Perch user who consumes housing and participates in social features, including swipes, reviews, event attendance, and friendships.
_Avoid_: General user

**Subletter**:
A Perch user who authors and maintains their housing listings. A Subletter does not perform Intern social actions.
_Avoid_: Subleaser, host role

**Friendship**:
A single undirected social relationship between two distinct interns. Its identity does not depend on which intern initiated the request.
_Avoid_: Follow, directional friendship

**Friend Request**:
The pending state of a Friendship. The requester initiates it, and only the addressee may accept or decline it; a declined request ceases to exist.
_Avoid_: Self-approved friendship

**Map Comment**:
A note anchored to an exact latitude and longitude pair. Unlike a legacy city-based note, its location does not depend on a city label.
_Avoid_: Unlocated map note

**Listing Provenance**:
The trusted record of whether a listing was auto-sourced or subletter-posted and which source supplied it. It is system-maintained, not author-editable.
_Avoid_: User-supplied source label

**Review Subject**:
The existing listing or subletter that a review evaluates. A user who is not a subletter is not a valid subletter Review Subject.
_Avoid_: Untyped review target

**Saved Perch**:
A listing an Intern right-swiped. It remains saved when its availability changes, with its current status shown to the Intern.
_Avoid_: Fresh deck candidate

**Fresh Listing**:
A listing whose status is available and whose expiry is in the future. Available status without a future expiry is not fresh.
_Avoid_: Available-only listing, permanent listing

**Listing Status**:
The server-maintained availability state of a listing. In the demo, pending and taken are display states supplied by the pipeline or seed, not user-authored states.
_Avoid_: Client-controlled availability

# Permission / access matrix (high priority)

| Actor / scope | List room root | Read nested shared folder | Read unshared ancestors | Rename shared folder | Create file under shared folder | Create/revoke sharing |
|---|---|---|---|---|---|---|
| Owner | Allow | Allow | Allow | Allow | Allow | Allow |
| Viewer (USER share to folder) | Deny full root * | Allow | No content/name disclosure | Deny | Deny | Deny |
| Authenticated unshared user | Deny | Deny | Deny | Deny | Deny | Deny |
| Anonymous with scoped PUBLIC_LINK | Deny full root * | Allow scoped resource | No unshared ancestor disclosure | Deny | Deny | Deny |
| Anonymous without link | Deny | Deny | Deny | Deny | Deny | Deny |
| Viewer after revoke | Deny | Deny new API reads | Deny | Deny | Deny | Deny |

* 'Deny full root' means avoid exposing resources outside the shared scope. Exact status (`403` vs `404`) depends on the endpoint and should not be used to infer presence of secret resources.

**Open question:** previously issued 5-min storage signed URLs might remain usable after revoke. Distinguish *newly requested URL* from *already issued URL* in reports.

Priority boundary checks: cross-user file ID/room ID/folder ID substitution, mixed parent chain, broken inheritance, share-to-file only, nested folder with confidential ancestor, session change, reuse of revoked link, and public vs email scope mixing.

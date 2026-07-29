# SecureCode AI Frontend

Presentation-ready, dependency-free investigation console for the SecureCode AI
hackathon project. The prototype is implemented with semantic HTML, modern CSS,
and vanilla JavaScript modules.

## Run locally

Serve the branch with any static HTTP server so JavaScript modules load
correctly. No installation or build step is required.

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Then open `http://127.0.0.1:4173/`.

## Prototype flow

1. Inspect the repository fingerprint in Mission Control.
2. Begin a live repository scan and watch five agents hand off work.
3. Follow the confirmed SQL injection attack path from input to impact.
4. Review evidence-rich casefiles for four vulnerability types.
5. Compare, edit, accept, or reject the proposed line-by-line patch.
6. Run five sequential verification gates and improve the security score.
7. See the developer decision become a structured model-learning signal.

Mock data lives in `mock-data.js`; asynchronous scan, verification, and feedback
behavior lives behind functions in `services.js` so real APIs can replace the
simulation later.

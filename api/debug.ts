import { VercelRequest, VercelResponse } from '@vercel/node';

export default function (req: VercelRequest, res: VercelResponse) {
    res.status(200).send('Debug endpoint working!');
}

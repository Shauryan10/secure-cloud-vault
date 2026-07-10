import { useEffect, useState } from "react";
import api from "../api/api";

function Dashboard() {

    const [user, setUser] = useState(null);

    useEffect(() => {

        api.get("/auth/me")
            .then(res => setUser(res.data));

    }, []);

    if (!user)
        return <h2>Loading...</h2>;

    return (

        <div style={{padding:"30px"}}>

            <h1>Welcome {user.username}</h1>

            <p>{user.email}</p>

            <p>{user.role}</p>

        </div>

    );

}

export default Dashboard;
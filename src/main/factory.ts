import { MeshBuilder, PhysicsImpostor, Vector3, StandardMaterial, Color3 } from "@babylonjs/core";
import { Game } from "./game";
import { NetworkObject } from "./object";
import { World } from "./world";

export class Factory{
    static Box(world: World, game: Game){
        const SIZE = 0.2;
        const MASS = 1;
        const RESTITUTION = 0.0;
        const FRICTION = 0.9;

        const mesh = MeshBuilder.CreateBox("", {
            width  : SIZE,
            height : SIZE,
            depth  : SIZE,
        }, game.scene);
        mesh.physicsImpostor = new PhysicsImpostor(mesh, PhysicsImpostor.BoxImpostor, 
            { 
                mass:        MASS, 
                restitution: RESTITUTION, 
                friction:    FRICTION,
                ignoreParent: true
            }, game.scene);
        mesh.position.set(0,2,0);
        
        mesh.physicsImpostor.setLinearVelocity(new Vector3(0,3,0));

        const material = new StandardMaterial("", game.scene);
        material.diffuseColor = new Color3(1, 0, 1);
        mesh.material = material;
        return new NetworkObject(mesh, game);
    }

    static TennisBall(world: World, game: Game){
        const DIAMETER = 0.1;
        const MASS = 0.1;
        const RESTITUTION = 0.8;
        const FRICTION = 0.0;

        const mesh = MeshBuilder.CreateSphere("", {
            diameter: DIAMETER,
        }, game.scene);
        mesh.physicsImpostor = new PhysicsImpostor(mesh, PhysicsImpostor.SphereImpostor, 
            { 
                mass:        MASS, 
                restitution: RESTITUTION, 
                friction:    FRICTION,
                ignoreParent: true
            }, game.scene);
        mesh.position.set(0,2,0);
        
        mesh.physicsImpostor.setLinearVelocity(new Vector3(0,3,0));

        const material = new StandardMaterial("", game.scene);
        material.diffuseColor = new Color3(1, 0, 1);
        mesh.material = material;
        return new NetworkObject(mesh, game);
    }
    static SoccerBall(world: World, game: Game){
        const DIAMETER = 0.3;
        const MASS = 0.5;
        const RESTITUTION = 0.8;
        const FRICTION = 0.0;

        const mesh = MeshBuilder.CreateSphere("", {
            diameter: DIAMETER,
        }, game.scene);
        mesh.physicsImpostor = new PhysicsImpostor(mesh, PhysicsImpostor.SphereImpostor, 
            { 
                mass:        MASS, 
                restitution: RESTITUTION, 
                friction:    FRICTION,
                ignoreParent: true
            }, game.scene);
        mesh.position.set(0,2,0);
        
        mesh.physicsImpostor.setLinearVelocity(new Vector3(0,3,0));

        const material = new StandardMaterial("", game.scene);
        material.diffuseColor = new Color3(1, 0, 1);
        mesh.material = material;
        return new NetworkObject(mesh, game);
    }

    static Paddle(world: World, game: Game){
        const DIAMETER = 0.4;
        const HEIGHT = 0.05;
        const MASS = 50;
        const RESTITUTION = 0.9;
        const FRICTION = 0.4;

        const mesh = MeshBuilder.CreateCylinder("", {
            diameter: DIAMETER,
            height: HEIGHT,
        }, game.scene);
        mesh.physicsImpostor = new PhysicsImpostor(mesh, PhysicsImpostor.CylinderImpostor, 
            { 
                mass:        MASS, 
                restitution: RESTITUTION, 
                friction:    FRICTION,
                ignoreParent: true
            }, game.scene);
        mesh.position.set(0,2,0);
        
        mesh.physicsImpostor.setLinearVelocity(new Vector3(0,3,0));

        const material = new StandardMaterial("", game.scene);
        material.diffuseColor = new Color3(1, 0, 1);
        mesh.material = material;
        return new NetworkObject(mesh, game);
    }
    static Bat(world: World, game: Game){
        const DIAMETER = 0.1;
        const HEIGHT = 0.7;
        const MASS = 50;
        const RESTITUTION = 0.9;
        const FRICTION = 0.4;

        const mesh = MeshBuilder.CreateCylinder("", {
            diameter: DIAMETER,
            height: HEIGHT,
        }, game.scene);
        mesh.physicsImpostor = new PhysicsImpostor(mesh, PhysicsImpostor.CylinderImpostor, 
            { 
                mass:        MASS, 
                restitution: RESTITUTION, 
                friction:    FRICTION,
                ignoreParent: true
            }, game.scene);
        mesh.position.set(0,2,0);
        
        mesh.physicsImpostor.setLinearVelocity(new Vector3(0,3,0));

        const material = new StandardMaterial("", game.scene);
        material.diffuseColor = new Color3(1, 0, 1);
        mesh.material = material;
        return new NetworkObject(mesh, game);
    }
}
/**
 * Copyright 2017 Acme Rocket Company [acmerocket.com]
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.acmerocket.ywiki;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;

public class ProjectProperties {
    private static final org.slf4j.Logger LOG = org.slf4j.LoggerFactory.getLogger(ProjectProperties.class);

	private static final Map<String,String> INST = new HashMap<>();
	static {
		try {
			InputStream in = ProjectProperties.class.getResourceAsStream("/project.properties");
			Properties props = new Properties();
			props.load(in);
			for (Map.Entry<Object, Object> entry : props.entrySet()) {
				INST.put(entry.getKey().toString(), entry.getValue().toString());
			}
		} 
		catch (IOException e) {
			LOG.error("Error loading properties", e);
		}
		// Local overrides (e.g. Cognito) from project root; not in repo
		try {
			File local = new File(System.getProperty("user.dir"), "project.local.properties");
			if (local.canRead()) {
				Properties localProps = new Properties();
				try (FileInputStream fin = new FileInputStream(local)) {
					localProps.load(fin);
				}
				for (Map.Entry<Object, Object> entry : localProps.entrySet()) {
					INST.put(entry.getKey().toString(), entry.getValue().toString());
				}
				LOG.info("Loaded local overrides from {}", local.getAbsolutePath());
			} else {
				LOG.info("No project.local.properties at {} (Cognito optional; create from project.local.properties.example to enable sign-in)", local.getAbsolutePath());
			}
		} catch (IOException e) {
			LOG.debug("No project.local.properties or error reading it: {}", e.getMessage());
		}
	}
	
	public static Map<String,String> instance() {
		return INST;
	}
}
